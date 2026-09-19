import {
  createMcpHandler,
  isLegacyRequest,
  WebStandardStreamableHTTPServerTransport
} from "@modelcontextprotocol/server";
import type { IncomingMessage, Server as NodeHttpServer, ServerResponse } from 'node:http'
import type { Socket } from 'node:net'
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

export interface NetServer extends NodeHttpServer {
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

// Loopback MCP requests are small JSON documents. Node owns HTTP framing; these
// caps remain LazyDesigner policy so a hostile local client cannot grow request
// state without bound.
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
  // SDK v2.0.0 currently ignores createMcpHandler(responseMode='json') for
  // legacy 2025 stateless traffic and emits SSE instead. Keep this bounded
  // official-SDK compatibility shim until that upstream behavior changes.
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
  // Modern 2026-07-28 traffic is owned by createMcpHandler. Legacy 2025 JSON
  // remains a compatibility-only SDK shim because server v2.0.0 does not yet
  // honor responseMode='json' for its built-in legacy fallback.
  const modernHandler = createMcpHandler(
    () => createRequestServer(phase, profile, phaseScoped),
    {
      legacy: 'reject',
      responseMode: 'json'
    }
  )

  try {
    const webResponse = await isLegacyRequest(webRequest)
      ? await handleLegacyJsonMcpRequest(webRequest, phase, profile, phaseScoped)
      : await modernHandler.fetch(webRequest)

    const responseHeaders: Record<string, string> = {}
    webResponse.headers.forEach((value: string, key: string) => {
      responseHeaders[key] = value
    })

    const contentType = webResponse.headers.get('content-type') || ''

    // MCP 2026 Streamable HTTP may represent a POST response as either JSON or
    // text/event-stream according to the client's Accept header. The official
    // modern SDK owns that choice. LazyDesigner buffers the finite response and
    // forwards its exact content type; only the legacy compatibility leg is
    // forced to JSON by handleLegacyJsonMcpRequest().
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

class RuntimePayloadTooLargeError extends Error {
  constructor () {
    super('Runtime request body exceeds the configured limit.')
    this.name = 'RuntimePayloadTooLargeError'
  }
}

function rawHeaderCount (request: IncomingMessage, name: string): number {
  const target = name.toLowerCase()
  let count = 0
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    if (request.rawHeaders[index]?.toLowerCase() === target) count += 1
  }
  return count
}

function singleRequestHeader (
  request: IncomingMessage,
  name: string
): string | null {
  const value = request.headers[name.toLowerCase()]
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

async function readNodeRequestBody (request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  let total = 0

  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += bytes.byteLength
    if (total > MAX_REQUEST_BODY_BYTES) {
      throw new RuntimePayloadTooLargeError()
    }
    chunks.push(bytes)
  }

  return Buffer.concat(chunks, total).toString('utf8')
}

function sendNodeResponse (
  response: ServerResponse,
  status: number,
  headers: Record<string, string>,
  body: string,
  closeConnection: boolean = false
): void {
  if (response.headersSent || response.writableEnded) return
  response.statusCode = status
  for (const [key, value] of Object.entries(headers)) {
    response.setHeader(key, value)
  }
  if (closeConnection) response.setHeader('connection', 'close')
  if (!response.hasHeader('content-length')) {
    response.setHeader('content-length', Buffer.byteLength(body))
  }
  response.end(body)
}

function jsonErrorBody (
  message: string,
  id: string | number | null = null,
  code: number = -32000
): string {
  return JSON.stringify({
    jsonrpc: '2.0',
    error: { code, message },
    id
  })
}

export default function createNetServer (
  {
    createServer
  }: {
    createServer: (
      options: { maxHeaderSize: number },
      callback: (request: IncomingMessage, response: ServerResponse) => void
    ) => NodeHttpServer
  },
  {
    port,
    endpoint,
    host = '127.0.0.1',
    generation = null
  }: {
    endpoint: string
    port: number
    host?: string
    generation?: number | null
  }
): NetServer {
  const activeSockets = new Set<Socket>()
  let shuttingDown = false
  let closePromise: Promise<void> | null = null

  const httpServer = createServer(
    { maxHeaderSize: MAX_REQUEST_HEADER_BYTES },
    (request: IncomingMessage, response: ServerResponse) => {
      void (async () => {
        if (shuttingDown) {
          response.setHeader('connection', 'close')
          response.destroy()
          return
        }

        const method = request.method ?? ''
        const rawPath = request.url ?? endpoint
        const pathWithoutQuery = rawPath.split('?')[0]
        const hostHeader = request.headers.host
        const originHeader = request.headers.origin
        const connectionClose =
          request.headers.connection?.toLowerCase() === 'close'

        if (
          rawHeaderCount(request, 'host') > 1 ||
          rawHeaderCount(request, 'origin') > 1 ||
          rawHeaderCount(request, 'mcp-method') > 1 ||
          rawHeaderCount(request, 'mcp-name') > 1 ||
          (request.httpVersion === '1.1' && hostHeader === undefined)
        ) {
          sendNodeResponse(
            response,
            400,
            { 'content-type': 'application/json' },
            jsonErrorBody('Bad Request: malformed or ambiguous HTTP headers'),
            true
          )
          return
        }

        if (request.headers['transfer-encoding'] !== undefined) {
          sendNodeResponse(
            response,
            400,
            { 'content-type': 'application/json' },
            jsonErrorBody(
              'Bad Request: Transfer-Encoding is not supported; send Content-Length.'
            ),
            true
          )
          return
        }

        const rawContentLength = request.headers['content-length']
        if (
          rawContentLength !== undefined &&
          (!/^\d+$/.test(rawContentLength) ||
            Number(rawContentLength) > MAX_REQUEST_BODY_BYTES)
        ) {
          const tooLarge =
            /^\d+$/.test(rawContentLength) &&
            Number(rawContentLength) > MAX_REQUEST_BODY_BYTES
          sendNodeResponse(
            response,
            tooLarge ? 413 : 400,
            { 'content-type': 'application/json' },
            tooLarge
              ? jsonErrorBody('Payload Too Large: request body exceeds limit')
              : jsonErrorBody('Bad Request: invalid Content-Length'),
            true
          )
          return
        }

        if (originHeader !== undefined && !isAllowedLocalOrigin(originHeader)) {
          sendNodeResponse(
            response,
            403,
            { 'content-type': 'application/json' },
            jsonErrorBody('Forbidden: invalid Origin header'),
            connectionClose
          )
          return
        }

        if (hostHeader !== undefined && !isAllowedLocalHost(hostHeader)) {
          sendNodeResponse(
            response,
            403,
            { 'content-type': 'application/json' },
            jsonErrorBody('Forbidden: invalid Host header'),
            connectionClose
          )
          return
        }

        let requestedProjectUuid: string | null
        try {
          requestedProjectUuid = normalizeProjectAffinityUuid(
            request.headers[BLOCKIT_PROJECT_AFFINITY_HEADER] as
              | string
              | undefined
          )
        } catch (error) {
          sendNodeResponse(
            response,
            400,
            { 'content-type': 'application/json' },
            projectContextErrorBody(
              null,
              error instanceof Error ? error.message : String(error)
            ),
            true
          )
          return
        }

        let requestedAuthoringPhase: McpAuthoringPhase | null
        try {
          requestedAuthoringPhase = normalizeAuthoringPhaseAffinity(
            request.headers[BLOCKIT_AUTHORING_PHASE_AFFINITY_HEADER] as
              | string
              | undefined
          )
        } catch (error) {
          sendNodeResponse(
            response,
            400,
            { 'content-type': 'application/json' },
            jsonErrorBody(
              error instanceof Error ? error.message : String(error)
            ),
            true
          )
          return
        }

        const effectiveAuthoringPhase =
          requestedAuthoringPhase ?? getActiveMcpAuthoringPhase()
        const activeProfile = getActiveMcpRegistrationProfile()

        if (
          pathWithoutQuery === '/health' ||
          pathWithoutQuery === endpoint + '/health'
        ) {
          sendNodeResponse(
            response,
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
            connectionClose
          )
          return
        }

        if (
          pathWithoutQuery === '/ready' ||
          pathWithoutQuery === endpoint + '/ready'
        ) {
          sendNodeResponse(
            response,
            200,
            { 'content-type': 'application/json' },
            JSON.stringify({ ready: true }),
            connectionClose
          )
          return
        }

        if (
          pathWithoutQuery !== endpoint &&
          !rawPath.startsWith(endpoint + '/') &&
          !rawPath.startsWith(endpoint + '?')
        ) {
          sendNodeResponse(
            response,
            404,
            { 'content-type': 'text/plain' },
            'Not Found',
            connectionClose
          )
          return
        }

        if (method !== 'POST') {
          sendNodeResponse(
            response,
            405,
            {
              'content-type': 'application/json',
              allow: 'POST'
            },
            jsonErrorBody('Method not allowed in stateless MCP mode.'),
            connectionClose
          )
          return
        }

        let body: string
        try {
          body = await readNodeRequestBody(request)
        } catch (error) {
          if (error instanceof RuntimePayloadTooLargeError) {
            sendNodeResponse(
              response,
              413,
              { 'content-type': 'application/json' },
              jsonErrorBody('Payload Too Large: request body exceeds limit'),
              true
            )
            return
          }
          throw error
        }

        const requestUrl = new URL(
          rawPath,
          `http://${hostHeader ?? `${host}:${port}`}`
        )
        const webHeaders = new Headers()
        for (const [key, value] of Object.entries(request.headers)) {
          if (Array.isArray(value)) {
            for (const item of value) webHeaders.append(key, item)
          } else if (value !== undefined) {
            webHeaders.set(key, value)
          }
        }
        const webRequest = new Request(requestUrl, {
          method,
          headers: webHeaders,
          body: body || undefined
        })
        const envelope = readRequestEnvelope(body)
        const routedMethodHeader = singleRequestHeader(request, 'mcp-method')
        const routedNameHeader = singleRequestHeader(request, 'mcp-name')

        if (
          (routedMethodHeader && envelope.method && routedMethodHeader !== envelope.method) ||
          (
            routedNameHeader &&
            envelope.capability &&
            routedNameHeader !== envelope.capability
          )
        ) {
          sendNodeResponse(
            response,
            400,
            { 'content-type': 'application/json' },
            jsonErrorBody('Bad Request: MCP routing headers disagree with the JSON-RPC body'),
            true
          )
          return
        }

        const routedMethod = routedMethodHeader ?? envelope.method
        const routedCapability = routedMethod === 'tools/call'
          ? routedNameHeader ?? envelope.capability
          : null
        const capabilityEffects = routedCapability
          ? getCapabilityMetadata(routedCapability).effects
          : null
        const needsProjectContext =
          routedMethod === 'tools/call' && requestedProjectUuid !== null
        const allowProjectTransition =
          capabilityEffects?.projectAffinity === 'adopt_created_project'

        try {
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
          const result = routedMethod === 'tools/call'
            ? await runRuntimeOperationExclusive(generation, async () => {
                if (
                  request.aborted ||
                  response.destroyed ||
                  shuttingDown
                ) {
                  throw new RuntimeRequestAbandonedError()
                }
                return await dispatch()
              })
            : await dispatch()

          if (
            requestedAuthoringPhase === null &&
            capabilityEffects?.phaseAffinity === 'update_from_result' &&
            envelope.targetAuthoringPhase !== null &&
            isSuccessfulToolCallResponse(result)
          ) {
            requestMcpPhaseSwitch(envelope.targetAuthoringPhase)
          }

          sendNodeResponse(
            response,
            result.status,
            result.headers,
            result.body,
            true
          )
        } catch (error) {
          if (
            error instanceof RuntimeRequestAbandonedError ||
            error instanceof RuntimeGenerationRetiredError
          ) return
          if (
            error instanceof RuntimeProjectContextError &&
            !error.outcomeUnknown
          ) {
            sendNodeResponse(
              response,
              409,
              { 'content-type': 'application/json' },
              projectContextErrorBody(envelope.id, error.message),
              true
            )
            return
          }

          console.error('[MCP] Request handler error:', error)
          sendNodeResponse(
            response,
            500,
            { 'content-type': 'application/json' },
            jsonErrorBody('Internal server error', null, -32603),
            true
          )
        }
      })().catch((error) => {
        console.error('[MCP] Unhandled HTTP request error:', error)
        sendNodeResponse(
          response,
          500,
          { 'content-type': 'application/json' },
          jsonErrorBody('Internal server error', null, -32603),
          true
        )
      })
    }
  ) as NetServer

  httpServer.on('connection', (socket: Socket) => {
    if (shuttingDown) {
      socket.destroy()
      return
    }
    activeSockets.add(socket)
    socket.setTimeout(SOCKET_IDLE_TIMEOUT_MS, () => {
      socket.destroy()
    })
    socket.once('close', () => activeSockets.delete(socket))
  })

  httpServer.on('clientError', (error: Error & { code?: string }, socket: Socket) => {
    if (!socket.writable) return
    const status =
      error.code === 'HPE_HEADER_OVERFLOW' ? 431 : 400
    const reason =
      status === 431
        ? 'Request Header Fields Too Large'
        : 'Bad Request'
    const body = jsonErrorBody(
      status === 431
        ? 'Bad Request: header section too large'
        : 'Bad Request: malformed HTTP request'
    )
    socket.end(
      `HTTP/1.1 ${status} ${reason}\r\n` +
        'Content-Type: application/json\r\n' +
        `Content-Length: ${Buffer.byteLength(body)}\r\n` +
        'Connection: close\r\n\r\n' +
        body
    )
  })

  httpServer.closeActiveSockets = () => {
    for (const socket of activeSockets) socket.destroy()
    activeSockets.clear()
  }

  httpServer.closeAndWait = () => {
    if (closePromise) return closePromise
    shuttingDown = true

    closePromise = new Promise<void>((resolve, reject) => {
      httpServer.close((error?: Error) => {
        const code = (error as (Error & { code?: string }) | undefined)?.code
        if (error && code !== 'ERR_SERVER_NOT_RUNNING') reject(error)
        else resolve()
      })
    })

    void waitForRuntimeOperationDrain().finally(() => {
      httpServer.closeActiveSockets()
    })

    return closePromise
  }

  httpServer.listen(port, host, () => {
    console.log(`[MCP] Server listening on http://${host}:${port}${endpoint}`)
  })

  httpServer.on('error', (error: Error) => {
    console.error('[MCP] Server error:', error)
    Blockbench.showQuickMessage(`MCP Server error: ${error.message}`, 3000)
  })

  return httpServer
}
