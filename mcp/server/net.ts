import {
  createMcpHandler,
  isLegacyRequest,
  WebStandardStreamableHTTPServerTransport
} from "@modelcontextprotocol/server";
import type { Server as NodeNetServer, Socket } from 'node:net'
import {
  registerToolsOnServer,
  registerResourcesOnServer,
  registerPromptsOnServer
} from '@/lib/factories'
import { createServer as createMcpServer } from '@/server/server'
import {
  DEFAULT_MCP_REGISTRATION_PROFILE,
  type McpRegistrationProfile
} from '@/lib/registrationProfile'
import { createProductIdentity } from '@/lib/productIdentity'
import { getCapabilityMetadata } from '@/lib/capabilityMetadata'
import {
  DEFAULT_MCP_AUTHORING_PHASE,
  getActiveMcpAuthoringPhase,
  type McpAuthoringPhase
} from '@/lib/authoringPhase'
import {
  getActiveMcpRegistrationProfile,
  getMcpSurfaceToolNames,
  requestMcpPhaseSwitch
} from '@/server/tools'
import {
  BLOCKIT_AUTHORING_PHASE_AFFINITY_HEADER,
  BLOCKIT_PROJECT_AFFINITY_HEADER,
  normalizeAuthoringPhaseAffinity,
  normalizeProjectAffinityUuid,
  type RuntimeProjectHealth
} from '@/gateway/projectAffinity'
import {
  RuntimeGenerationRetiredError,
  runRuntimeOperationExclusive,
  waitForRuntimeOperationDrain
} from '@/lib/runtimeLifecycle'

const INSTANCE_ID = crypto.randomUUID()
const STARTUP_TIME = new Date().toISOString()

export function normalizeBuildIdentity (value: unknown): string {
  return typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value)
    ? value
    : 'source'
}

const BUILD_IDENTITY = normalizeBuildIdentity(
  (globalThis as { __BLOCKIT_BUILD_ID__?: unknown }).__BLOCKIT_BUILD_ID__
)

export interface NetServer extends NodeNetServer {
  closeActiveSockets(): void
  closeAndWait(): Promise<void>
}

export class RuntimeProjectContextError extends Error {
  constructor (
    message: string,
    readonly outcomeUnknown: boolean = false
  ) {
    super(message)
    this.name = 'RuntimeProjectContextError'
  }
}

class RuntimeRequestAbandonedError extends Error {
  constructor () {
    super('Queued Runtime tool request was abandoned before execution.')
    this.name = 'RuntimeRequestAbandonedError'
  }
}

function getStatusText (status: number): string {
  const texts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    204: 'No Content',
    400: 'Bad Request',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    409: 'Conflict',
    413: 'Payload Too Large',
    415: 'Unsupported Media Type',
    431: 'Request Header Fields Too Large',
    500: 'Internal Server Error'
  }
  return texts[status] || 'Unknown'
}

// Loopback MCP requests are small JSON documents. These caps exist so a hostile
// local client cannot grow the parser buffer without bound.
const MAX_REQUEST_HEADER_BYTES = 32 * 1024
const MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024
const SOCKET_IDLE_TIMEOUT_MS = 30_000

function isAllowedLocalOrigin (origin: string): boolean {
  try {
    const parsed = new URL(origin)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false

    const hostname = parsed.hostname.toLowerCase()
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname === '::1'
    )
  } catch {
    return false
  }
}

// Defense-in-depth against DNS rebinding: a rebound browser page would carry a
// remote Host value even though its Origin gate may not fire on same-site forms.
function isAllowedLocalHost (hostHeader: string): boolean {
  try {
    const parsed = new URL(`http://${hostHeader.trim()}`)
    const hostname = parsed.hostname.toLowerCase()
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]'
    )
  } catch {
    return false
  }
}

function runtimeProjects (): ModelProject[] {
  return typeof ModelProject !== 'undefined' && Array.isArray(ModelProject.all)
    ? ModelProject.all
    : []
}

function currentRuntimeProject (): ModelProject | null {
  return typeof Project !== 'undefined' && Project ? Project : null
}

let runtimeProjectAffinityLease: {
  previousProject: ModelProject | null
} | null = null

export function getRuntimeProjectHealth (
  requestedProjectUuid: string | null
): RuntimeProjectHealth {
  const projects = runtimeProjects()
  const currentProject = currentRuntimeProject()
  const leasedPreviousProject = runtimeProjectAffinityLease?.previousProject ?? null
  const activeProject = runtimeProjectAffinityLease
    ? leasedPreviousProject && projects.includes(leasedPreviousProject)
      ? leasedPreviousProject
      : null
    : currentProject
  const requestedProject = requestedProjectUuid
    ? projects.find(project => project.uuid === requestedProjectUuid) ?? null
    : null

  return {
    active_project_uuid: activeProject?.uuid ?? null,
    requested_project_uuid: requestedProjectUuid,
    requested_project_available: requestedProjectUuid
      ? requestedProject !== null
      : null,
    open_project_count: projects.length
  }
}

/**
 * Execute one project-sensitive MCP request against its Gateway-bound tab.
 *
 * Blockbench exposes project data through globals (`Project`, `Cube.all`, etc.),
 * so targeting an inactive tab requires a native project select. The runtime
 * serializes MCP requests across sockets before entering this helper. The target
 * tab is temporarily locked against tab switching/close, then the user's prior
 * active tab is restored. Project-transition calls intentionally keep the newly
 * created/replaced tab active so the Gateway can adopt the authoritative result.
 */
export async function runWithRuntimeProjectAffinity<T> (
  requestedProjectUuid: string | null,
  allowProjectTransition: boolean,
  operation: () => Promise<T>
): Promise<T> {
  if (!requestedProjectUuid) return await operation()

  const projects = runtimeProjects()
  const target = projects.find(project => project.uuid === requestedProjectUuid)
  if (!target) {
    throw new RuntimeProjectContextError(
      `Gateway-bound Blockbench project ${requestedProjectUuid} is no longer open.`
    )
  }

  const previousProject = currentRuntimeProject()
  let switched = false

  if (previousProject !== target) {
    if (previousProject?.locked || target.locked) {
      throw new RuntimeProjectContextError(
        `Blockbench cannot activate Gateway-bound project ${requestedProjectUuid} because the current or target project tab is locked.`
      )
    }
    const selected = target.select()
    if (selected !== true || currentRuntimeProject() !== target) {
      throw new RuntimeProjectContextError(
        `Blockbench could not activate Gateway-bound project ${requestedProjectUuid}.`
      )
    }
    switched = true
  }

  const originalTargetLocked = target.locked === true
  const lease = { previousProject }
  runtimeProjectAffinityLease = lease
  if (!allowProjectTransition) target.locked = true

  try {
    const result = await operation()
    if (!allowProjectTransition && currentRuntimeProject() !== target) {
      throw new RuntimeProjectContextError(
        `Blockbench project context changed while Gateway-bound project ${requestedProjectUuid} was executing.`,
        true
      )
    }
    return result
  } finally {
    const stillOpen = runtimeProjects().includes(target)
    if (!allowProjectTransition && stillOpen) {
      target.locked = originalTargetLocked
    }

    if (runtimeProjectAffinityLease === lease) {
      runtimeProjectAffinityLease = null
    }

    if (
      !allowProjectTransition &&
      switched &&
      previousProject &&
      runtimeProjects().includes(previousProject) &&
      currentRuntimeProject() !== previousProject
    ) {
      previousProject.select()
    }
  }
}

function readRequestEnvelope (body: string): {
  method: string | null
  capability: string | null
  targetAuthoringPhase: McpAuthoringPhase | null
  id: string | number | null
} {
  try {
    const parsed = JSON.parse(body) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { method: null, capability: null, targetAuthoringPhase: null, id: null }
    }
    const record = parsed as {
      method?: unknown
      id?: unknown
      params?: {
        name?: unknown
        arguments?: { target_phase?: unknown }
      }
    }
    const capability =
      record.method === 'tools/call' && typeof record.params?.name === 'string'
        ? record.params.name
        : null
    const capabilityEffects = capability
      ? getCapabilityMetadata(capability).effects
      : null
    let targetAuthoringPhase: McpAuthoringPhase | null = null
    if (capabilityEffects?.phaseAffinity === 'update_from_result') {
      try {
        targetAuthoringPhase = normalizeAuthoringPhaseAffinity(
          record.params?.arguments?.target_phase
        )
      } catch {
        targetAuthoringPhase = null
      }
    }
    return {
      method: typeof record.method === 'string' ? record.method : null,
      capability,
      targetAuthoringPhase,
      id:
        typeof record.id === 'string' || typeof record.id === 'number'
          ? record.id
          : null
    }
  } catch {
    return { method: null, capability: null, targetAuthoringPhase: null, id: null }
  }
}

function projectContextErrorBody (
  id: string | number | null,
  message: string
): string {
  return JSON.stringify({
    jsonrpc: '2.0',
    error: { code: -32002, message },
    id
  })
}

interface SerializedWebResponse {
  status: number
  headers: Record<string, string>
  body: string
}

function isSuccessfulToolCallResponse (response: SerializedWebResponse): boolean {
  if (response.status !== 200) return false
  try {
    const parsed = JSON.parse(response.body) as {
      error?: unknown
      result?: { isError?: unknown }
    }
    return parsed.error === undefined && parsed.result?.isError !== true
  } catch {
    return false
  }
}

/**
 * Handle one MCP HTTP request with request-owned server/transport state.
 *
 * The transport deliberately omits a session ID generator, so the SDK does not
 * create or require Mcp-Session-Id. JSON response mode keeps the normal BlockIT
 * path request/response-only; standalone GET/SSE is rejected by the outer HTTP
 * route before this helper is called.
 */
function createRequestServer (
  phase: McpAuthoringPhase,
  profile: McpRegistrationProfile,
  phaseScoped: boolean
) {
  const requestServer = createMcpServer(phase, profile)
  const scopedToolNames = phaseScoped
    ? getMcpSurfaceToolNames(profile, phase)
    : undefined
  registerToolsOnServer(requestServer, scopedToolNames)
  registerResourcesOnServer(requestServer)
  registerPromptsOnServer(requestServer)
  return requestServer
}

async function handleLegacyJsonMcpRequest (
  webRequest: Request,
  phase: McpAuthoringPhase,
  profile: McpRegistrationProfile,
  phaseScoped: boolean
): Promise<Response> {
  const requestServer = createRequestServer(phase, profile, phaseScoped)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  })
  await requestServer.connect(transport)
  try {
    return await transport.handleRequest(webRequest)
  } finally {
    await requestServer.close()
  }
}

async function handleStatelessMcpRequest (
  webRequest: Request,
  phase: McpAuthoringPhase = getActiveMcpAuthoringPhase(),
  profile: McpRegistrationProfile = DEFAULT_MCP_REGISTRATION_PROFILE,
  phaseScoped: boolean = false
): Promise<SerializedWebResponse> {
  // Modern 2026-07-28 traffic uses the official v2 handler. Legacy 2025
  // traffic temporarily retains LazyDesigner's established stateless JSON
  // response shape until Gateway/client migration is complete. Both legs build
  // the same request-owned server surface; there is no second capability model.
  const modernHandler = createMcpHandler(
    () => createRequestServer(phase, profile, phaseScoped),
    {
      legacy: 'reject',
      responseMode: 'json'
    }
  )

  try {
    const legacy = await isLegacyRequest(webRequest)
    const webResponse = legacy
      ? await handleLegacyJsonMcpRequest(webRequest, phase, profile, phaseScoped)
      : await modernHandler.fetch(webRequest)

    const responseHeaders: Record<string, string> = {}
    webResponse.headers.forEach((value: string, key: string) => {
      responseHeaders[key] = value
    })

    const contentType = webResponse.headers.get('content-type') || ''
    if (contentType.includes('text/event-stream')) {
      throw new Error(
        'Unexpected SSE response in the request/response Runtime path.'
      )
    }

    if (!contentType && webResponse.status !== 204 && webResponse.status !== 202) {
      responseHeaders['content-type'] = 'application/json'
    }

    return {
      status: webResponse.status,
      headers: responseHeaders,
      body: await webResponse.text()
    }
  } finally {
    await modernHandler.close()
  }
}

export default function createNetServer (
  {
    createServer
  }: { createServer: (callback: (socket: Socket) => void) => NodeNetServer },
  {
    port,
    endpoint,
    host = '127.0.0.1',
    profile = DEFAULT_MCP_REGISTRATION_PROFILE,
    phase = DEFAULT_MCP_AUTHORING_PHASE,
    generation = null
  }: {
    endpoint: string
    port: number
    host?: string
    profile?: McpRegistrationProfile
    phase?: McpAuthoringPhase
    generation?: number | null
  }
): NetServer {
  const activeSockets = new Set<Socket>()
  let shuttingDown = false
  let closePromise: Promise<void> | null = null

  const httpServer = createServer((socket: Socket) => {
    if (shuttingDown) {
      socket.destroy()
      return
    }

    activeSockets.add(socket)
    let buffer = Buffer.alloc(0)
    let socketEnded = false
    let processing = false
    let awaitingDrain = false

    socket.setTimeout(SOCKET_IDLE_TIMEOUT_MS, () => {
      if (!socketEnded) socket.destroy()
    })

    socket.on('data', (chunk: Buffer) => {
      if (socketEnded || shuttingDown) return
      buffer = Buffer.concat([buffer, chunk])
      void processBufferedRequests()
    })

    socket.on('drain', () => {
      awaitingDrain = false
      void processBufferedRequests()
    })

    socket.on('error', (err: Error) => {
      if (err.message !== 'read ECONNRESET') {
        console.error('[MCP] Socket error:', err.message)
      }
      socket.destroy()
    })

    socket.on('close', () => {
      buffer = Buffer.alloc(0)
      activeSockets.delete(socket)
    })

    async function processBufferedRequests (): Promise<void> {
      if (processing || awaitingDrain || shuttingDown) return
      processing = true

      try {
        while (true) {
          if (shuttingDown || socketEnded || socket.destroyed || !socket.writable) return

          const headerEnd = buffer.indexOf('\r\n\r\n')
          if (headerEnd === -1) {
            if (buffer.length > MAX_REQUEST_HEADER_BYTES) {
              sendResponse(
                socket,
                431,
                { 'content-type': 'application/json' },
                JSON.stringify({
                  jsonrpc: '2.0',
                  error: { code: -32000, message: 'Bad Request: header section too large' },
                  id: null
                }),
                'close'
              )
              buffer = Buffer.alloc(0)
            }
            return
          }
          if (headerEnd > MAX_REQUEST_HEADER_BYTES) {
            sendResponse(
              socket,
              431,
              { 'content-type': 'application/json' },
              JSON.stringify({
                jsonrpc: '2.0',
                error: { code: -32000, message: 'Bad Request: header section too large' },
                id: null
              }),
              'close'
            )
            buffer = Buffer.alloc(0)
            return
          }

          const headerSection = buffer.subarray(0, headerEnd).toString()
          const lines = headerSection.split('\r\n')
          const requestLineParts = lines[0].split(' ')
          const [method, path, version] = requestLineParts

          if (
            requestLineParts.length !== 3 ||
            !method ||
            !path ||
            !version ||
            !/^HTTP\/1\.[01]$/.test(version)
          ) {
            sendResponse(
              socket,
              400,
              { 'content-type': 'application/json' },
              JSON.stringify({
                jsonrpc: '2.0',
                error: { code: -32000, message: 'Bad Request: malformed request line' },
                id: null
              }),
              undefined
            )
            buffer = Buffer.alloc(0)
            return
          }

          const headers: Record<string, string> = {}
          const contentLengthValues: string[] = []
          const singletonHeaderCounts = new Map<string, number>()
          let malformedHeader = false
          for (let i = 1; i < lines.length; i++) {
            const colonIdx = lines[i].indexOf(':')
            if (colonIdx <= 0) {
              malformedHeader = true
              break
            }

            const rawKey = lines[i].substring(0, colonIdx).trim()
            // RFC 9110 field names are tokens. Reject malformed names instead of
            // silently ignoring them and letting different parsers disagree.
            if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(rawKey)) {
              malformedHeader = true
              break
            }

            const key = rawKey.toLowerCase()
            const value = lines[i].substring(colonIdx + 1).trim()
            if (key === 'content-length') {
              contentLengthValues.push(value)
            }
            if (key === 'host' || key === 'origin') {
              singletonHeaderCounts.set(key, (singletonHeaderCounts.get(key) ?? 0) + 1)
            }
            headers[key] = value
          }

          if (
            malformedHeader ||
            singletonHeaderCounts.get('host')! > 1 ||
            singletonHeaderCounts.get('origin')! > 1 ||
            (version === 'HTTP/1.1' && headers['host'] === undefined)
          ) {
            sendResponse(
              socket,
              400,
              { 'content-type': 'application/json' },
              JSON.stringify({
                jsonrpc: '2.0',
                error: {
                  code: -32000,
                  message: 'Bad Request: malformed or ambiguous HTTP headers'
                },
                id: null
              }),
              'close'
            )
            buffer = Buffer.alloc(0)
            return
          }

          // Chunked framing is not implemented; accepting it would leave the
          // chunked bytes in the buffer and desync every later request.
          if (headers['transfer-encoding'] !== undefined) {
            sendResponse(
              socket,
              400,
              { 'content-type': 'application/json' },
              JSON.stringify({
                jsonrpc: '2.0',
                error: {
                  code: -32000,
                  message: 'Bad Request: Transfer-Encoding is not supported; send Content-Length.'
                },
                id: null
              }),
              'close'
            )
            buffer = Buffer.alloc(0)
            return
          }

          const rawContentLength = headers['content-length'] || '0'
          const distinctContentLengths = new Set(contentLengthValues)
          const contentLength = Number.parseInt(rawContentLength, 10)
          if (
            distinctContentLengths.size > 1 ||
            !/^\d+$/.test(rawContentLength) ||
            !Number.isFinite(contentLength) ||
            contentLength < 0
          ) {
            sendResponse(
              socket,
              400,
              { 'content-type': 'application/json' },
              JSON.stringify({
                jsonrpc: '2.0',
                error: { code: -32000, message: 'Bad Request: invalid Content-Length' },
                id: null
              }),
              headers['connection']
            )
            buffer = Buffer.alloc(0)
            return
          }

          if (contentLength > MAX_REQUEST_BODY_BYTES) {
            sendResponse(
              socket,
              413,
              { 'content-type': 'application/json' },
              JSON.stringify({
                jsonrpc: '2.0',
                error: { code: -32000, message: 'Payload Too Large: request body exceeds limit' },
                id: null
              }),
              'close'
            )
            buffer = Buffer.alloc(0)
            return
          }

          const bodyStart = headerEnd + 4
          const requestEnd = bodyStart + contentLength
          if (buffer.length < requestEnd) return

          const body = buffer.subarray(bodyStart, requestEnd).toString()
          buffer = buffer.subarray(requestEnd)

          const origin = headers['origin']
          if (origin !== undefined && !isAllowedLocalOrigin(origin)) {
            sendResponse(
              socket,
              403,
              { 'content-type': 'application/json' },
              JSON.stringify({
                jsonrpc: '2.0',
                error: {
                  code: -32000,
                  message: 'Forbidden: invalid Origin header'
                },
                id: null
              }),
              headers['connection']
            )
            continue
          }

          const hostHeader = headers['host']
          if (hostHeader !== undefined && !isAllowedLocalHost(hostHeader)) {
            sendResponse(
              socket,
              403,
              { 'content-type': 'application/json' },
              JSON.stringify({
                jsonrpc: '2.0',
                error: {
                  code: -32000,
                  message: 'Forbidden: invalid Host header'
                },
                id: null
              }),
              headers['connection']
            )
            continue
          }

          let requestedProjectUuid: string | null
          try {
            requestedProjectUuid = normalizeProjectAffinityUuid(
              headers[BLOCKIT_PROJECT_AFFINITY_HEADER]
            )
          } catch (error) {
            sendResponse(
              socket,
              400,
              { 'content-type': 'application/json' },
              projectContextErrorBody(
                readRequestEnvelope(body).id,
                error instanceof Error ? error.message : String(error)
              ),
              'close'
            )
            continue
          }

          let requestedAuthoringPhase: McpAuthoringPhase | null
          try {
            requestedAuthoringPhase = normalizeAuthoringPhaseAffinity(
              headers[BLOCKIT_AUTHORING_PHASE_AFFINITY_HEADER]
            )
          } catch (error) {
            sendResponse(
              socket,
              400,
              { 'content-type': 'application/json' },
              JSON.stringify({
                jsonrpc: '2.0',
                error: {
                  code: -32000,
                  message: error instanceof Error ? error.message : String(error)
                },
                id: readRequestEnvelope(body).id
              }),
              'close'
            )
            continue
          }

          const effectiveAuthoringPhase =
            requestedAuthoringPhase ?? getActiveMcpAuthoringPhase()
          const activeProfile = getActiveMcpRegistrationProfile()
          const pathWithoutQuery = path.split('?')[0]

          if (
            pathWithoutQuery === '/health' ||
            pathWithoutQuery === endpoint + '/health'
          ) {
            sendResponse(
              socket,
              200,
              { 'content-type': 'application/json' },
              JSON.stringify({
                status: 'ok',
                timestamp: new Date().toISOString(),
                product: createProductIdentity(
                  activeProfile,
                  effectiveAuthoringPhase
                ),
                build_identity: BUILD_IDENTITY,
                instance_id: INSTANCE_ID,
                startup_time: STARTUP_TIME,
                exposed_tool_count: getMcpSurfaceToolNames(
                  activeProfile,
                  effectiveAuthoringPhase
                ).length,
                project_context: getRuntimeProjectHealth(requestedProjectUuid),
                transport: {
                  mode: 'stateless',
                  response_mode: 'json'
                }
              }),
              headers['connection']
            )
            continue
          }

          if (
            pathWithoutQuery === '/ready' ||
            pathWithoutQuery === endpoint + '/ready'
          ) {
            sendResponse(
              socket,
              200,
              { 'content-type': 'application/json' },
              JSON.stringify({ ready: true }),
              headers['connection']
            )
            continue
          }

          if (
            pathWithoutQuery !== endpoint &&
            !path.startsWith(endpoint + '/') &&
            !path.startsWith(endpoint + '?')
          ) {
            sendResponse(
              socket,
              404,
              { 'content-type': 'text/plain' },
              'Not Found',
              headers['connection']
            )
            continue
          }

          // BlockIT does not offer a standalone server-to-client SSE stream in
          // the default stateless path. MCP 2025-11-25 explicitly permits 405
          // for GET when that stream is not offered. DELETE is also session-only
          // and therefore not meaningful when the server does not issue sessions.
          if (method !== 'POST') {
            sendResponse(
              socket,
              405,
              {
                'content-type': 'application/json',
                allow: 'POST'
              },
              JSON.stringify({
                jsonrpc: '2.0',
                error: {
                  code: -32000,
                  message: 'Method not allowed in stateless MCP mode.'
                },
                id: null
              }),
              headers['connection']
            )
            continue
          }

          const url = `http://${host}:${port}${path}`
          const webHeaders = new Headers()
          for (const [key, value] of Object.entries(headers)) {
            webHeaders.set(key, value)
          }

          const requestInit: RequestInit = {
            method,
            headers: webHeaders
          }
          if (body) {
            requestInit.body = body
          }
          const webRequest = new Request(url, requestInit)
          const envelope = readRequestEnvelope(body)
          const capabilityEffects = envelope.capability
            ? getCapabilityMetadata(envelope.capability).effects
            : null
          const needsProjectContext =
            envelope.method === 'tools/call' && requestedProjectUuid !== null
          const allowProjectTransition =
            capabilityEffects?.projectAffinity === 'adopt_created_project'

          try {
            // The input idle timeout protects incomplete local HTTP requests only.
            // Once a complete MCP request is parsed, the SDK/Gateway call deadline
            // owns execution time so legitimate long authoring calls are not cut off.
            socket.setTimeout(0)
            const execute = async () => await handleStatelessMcpRequest(
              webRequest,
              effectiveAuthoringPhase,
              activeProfile,
              requestedAuthoringPhase !== null
            )
            const dispatch = async () => needsProjectContext
              ? await runWithRuntimeProjectAffinity(
                  requestedProjectUuid,
                  allowProjectTransition,
                  execute
                )
              : await execute()
            const response = envelope.method === 'tools/call'
              ? await runRuntimeOperationExclusive(generation, async () => {
                  if (socket.destroyed || !socket.writable || shuttingDown) {
                    throw new RuntimeRequestAbandonedError()
                  }
                  return await dispatch()
                })
              : await dispatch()

            // Direct Runtime/Inspector clients keep the existing global phase
            // behavior. Gateway requests carry a phase affinity header, so their
            // handoff changes only that Gateway and cannot disturb another chat.
            if (
              requestedAuthoringPhase === null &&
              capabilityEffects?.phaseAffinity === 'update_from_result' &&
              envelope.targetAuthoringPhase !== null &&
              isSuccessfulToolCallResponse(response)
            ) {
              requestMcpPhaseSwitch(envelope.targetAuthoringPhase)
            }

            // Stateless MCP has no session state to preserve across requests.
            // Close each MCP response so a client-side keep-alive socket cannot
            // remain poisoned when a previous Blockbench operation stalls.
            const sent = sendResponse(
              socket,
              response.status,
              response.headers,
              response.body,
              'close'
            )
            if (!sent) {
              awaitingDrain = true
              return
            }
          } catch (error) {
            if (
              error instanceof RuntimeRequestAbandonedError ||
              error instanceof RuntimeGenerationRetiredError
            ) return
            if (error instanceof RuntimeProjectContextError && !error.outcomeUnknown) {
              sendResponse(
                socket,
                409,
                { 'content-type': 'application/json' },
                projectContextErrorBody(envelope.id, error.message),
                'close'
              )
              continue
            }
            console.error('[MCP] Request handler error:', error)
            sendResponse(
              socket,
              500,
              { 'content-type': 'application/json' },
              JSON.stringify({
                jsonrpc: '2.0',
                error: { code: -32603, message: 'Internal server error' },
                id: null
              }),
              'close'
            )
          }
        }
      } catch (error) {
        console.error('[MCP] Unhandled error in processBufferedRequests:', error)
        if (!socket.destroyed && socket.writable) {
          sendResponse(
            socket,
            500,
            { 'content-type': 'application/json' },
            JSON.stringify({
              jsonrpc: '2.0',
              error: { code: -32603, message: 'Internal server error' },
              id: null
            }),
            'close'
          )
        }
      } finally {
        processing = false
        // An incomplete header/body must wait for the next data event.
        // Complete buffered requests are drained by the loop above; backpressure
        // resumes through drain. Re-entering here spins on unchanged bytes.
      }
    }

    function sendResponse (
      sock: Socket,
      status: number,
      headers: Record<string, string>,
      body: string,
      connection?: string
    ): boolean {
      if (socketEnded || sock.destroyed || !sock.writable) {
        return false
      }

      let response = `HTTP/1.1 ${status} ${getStatusText(status)}\r\n`
      headers['content-length'] = Buffer.byteLength(body).toString()

      // HTTP/1.1 connection reuse is independent from MCP protocol sessions.
      // Keep the socket reusable unless the client explicitly requests close.
      const keepAlive = connection?.toLowerCase() !== 'close'
      headers['connection'] = keepAlive ? 'keep-alive' : 'close'

      if (!headers['date']) {
        headers['date'] = new Date().toUTCString()
      }

      for (const [key, value] of Object.entries(headers)) {
        response += `${key}: ${value}\r\n`
      }
      response += '\r\n'
      response += body

      if (!keepAlive) {
        socketEnded = true
        sock.write(response, () => {
          sock.end()
        })
        return true
      }

      // Backpressure: false means the kernel buffer is full. The caller pauses
      // pipelined dispatch and resumes on the socket drain event.
      return sock.write(response)
    }
  }) as NetServer

  httpServer.closeActiveSockets = () => {
    for (const socket of activeSockets) {
      socket.destroy()
    }
    activeSockets.clear()
  }

  httpServer.closeAndWait = () => {
    if (closePromise) return closePromise
    shuttingDown = true

    // `listen()` is asynchronous. Calling close immediately after listen can
    // report ERR_SERVER_NOT_RUNNING while still cancelling the pending bind.
    // Treat that specific callback result as successful shutdown so plugin
    // reload cannot leave a ghost listener between generations.
    closePromise = new Promise<void>((resolve, reject) => {
      httpServer.close((error?: Error) => {
        const code = (error as (Error & { code?: string }) | undefined)?.code
        if (error && code !== 'ERR_SERVER_NOT_RUNNING') reject(error)
        else resolve()
      })
    })

    // Stop accepting immediately, but let the one already-running native tool
    // finish before destroying its socket. This keeps reload/restart deterministic
    // without letting stale keep-alive connections delay listener replacement.
    void waitForRuntimeOperationDrain().finally(() => {
      httpServer.closeActiveSockets()
    })

    return closePromise
  }

  httpServer.listen(port, host, () => {
    console.log(`[MCP] Server listening on http://${host}:${port}${endpoint}`)
  })

  httpServer.on('error', (err: Error) => {
    console.error('[MCP] Server error:', err)
    Blockbench.showQuickMessage(`MCP Server error: ${err.message}`, 3000)
  })

  return httpServer
}
