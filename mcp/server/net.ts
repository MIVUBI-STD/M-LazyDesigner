import {
  createMcpHandler,
  isLegacyRequest,
  WebStandardStreamableHTTPServerTransport
} from "@modelcontextprotocol/server";
import type { IncomingMessage, Server as NodeHttpServer, ServerResponse } from 'node:http'
import type { Socket } from 'node:net'
import {
  MAX_REQUEST_BODY_BYTES,
  MAX_REQUEST_HEADER_BYTES,
  RuntimePayloadTooLargeError,
  SOCKET_IDLE_TIMEOUT_MS,
  isAllowedLocalHost,
  isAllowedLocalOrigin,
  jsonErrorBody,
  rawHeaderCount,
  readNodeRequestBody,
  sendNodeResponse,
  singleRequestHeader
} from '@/server/httpBoundary'
import {
  registerToolsOnServer,
  registerResourcesOnServer,
  registerPromptsOnServer
} from '@/lib/factories'
import { createServer as createMcpServer } from '@/server/server'
import { conformanceFixturesEnabled } from '@/server/conformanceFixtures'
import {
  DEFAULT_MCP_REGISTRATION_PROFILE,
  type McpRegistrationProfile
} from '@/lib/registrationProfile'
import { createProductIdentity } from '@/lib/productIdentity'
import {
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
  normalizeProjectAffinityUuid
} from '@/lib/runtimeAffinity'
import {
  RuntimeGenerationRetiredError,
  runRuntimeOperationExclusive,
  waitForRuntimeOperationDrain
} from '@/lib/runtimeLifecycle'
import {
  RuntimeProjectContextError,
  getRuntimeProjectHealth,
  runWithRuntimeProjectAffinity
} from '@/server/projectAffinity'
import {
  isSuccessfulToolCallResponse,
  projectContextErrorBody,
  readRequestEnvelope,
  type SerializedWebResponse
} from '@/server/requestProtocol'

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

class RuntimeRequestAbandonedError extends Error {
  constructor () {
    super('Queued Runtime tool request was abandoned before execution.')
    this.name = 'RuntimeRequestAbandonedError'
  }
}

/**
 * Handle one MCP HTTP request with request-owned server/transport state.
 *
 * The transport deliberately omits a session ID generator, so the SDK does not
 * create or require Mcp-Session-Id. Modern POST responses use SDK auto
 * representation (JSON or request-related SSE); standalone GET/session SSE is
 * still rejected by the outer HTTP route before this helper is called.
 */
function createRequestServer (
  phase: McpAuthoringPhase,
  profile: McpRegistrationProfile,
  phaseScoped: boolean
) {
  const requestServer = createMcpServer(phase, profile)
  if (conformanceFixturesEnabled()) return requestServer

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
  // The modern handler uses responseMode='auto' so ordinary calls stay JSON
  // while related progress/log messages can upgrade the request to SSE. The
  // legacy compatibility leg remains explicitly JSON below; SDK v2.0.0 does
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
      responseMode: 'auto'
    }
  )

  let deferModernClose = false
  try {
    const legacyRequest = await isLegacyRequest(webRequest)
    const webResponse = legacyRequest
      ? await handleLegacyJsonMcpRequest(webRequest, phase, profile, phaseScoped)
      : await modernHandler.fetch(webRequest)

    const responseHeaders: Record<string, string> = {}
    webResponse.headers.forEach((value: string, key: string) => {
      responseHeaders[key] = value
    })

    const contentType = webResponse.headers.get('content-type') || ''

    // MCP 2026 Streamable HTTP may represent a POST response as either JSON or
    // text/event-stream when related messages require streaming. The official
    // modern SDK owns that choice. LazyDesigner buffers the finite response and
    // forwards its exact content type; only the legacy compatibility leg is
    // forced to JSON by handleLegacyJsonMcpRequest().
    if (!contentType && webResponse.status !== 204 && webResponse.status !== 202) {
      responseHeaders['content-type'] = 'application/json'
    }

    if (
      !legacyRequest &&
      contentType.includes('text/event-stream') &&
      webResponse.body
    ) {
      deferModernClose = true
      return {
        status: webResponse.status,
        headers: responseHeaders,
        body: webResponse.body,
        finalize: async () => {
          await modernHandler.close()
        }
      }
    }

    return {
      status: webResponse.status,
      headers: responseHeaders,
      body: await webResponse.text()
    }
  } finally {
    if (!deferModernClose) await modernHandler.close()
  }
}

async function sendSerializedWebResponse (
  response: ServerResponse,
  serialized: SerializedWebResponse,
  closeConnection: boolean
): Promise<void> {
  if (typeof serialized.body === 'string') {
    sendNodeResponse(
      response,
      serialized.status,
      serialized.headers,
      serialized.body,
      closeConnection
    )
    await serialized.finalize?.()
    return
  }

  if (response.headersSent || response.writableEnded) {
    await serialized.finalize?.()
    return
  }

  response.statusCode = serialized.status
  for (const [key, value] of Object.entries(serialized.headers)) {
    if (key.toLowerCase() === 'content-length') continue
    response.setHeader(key, value)
  }
  if (closeConnection) response.setHeader('connection', 'close')

  const reader = serialized.body.getReader()
  let clientClosed = false
  const cancelReader = () => {
    clientClosed = true
    void reader.cancel().catch(() => {})
  }
  response.once('close', cancelReader)

  try {
    while (!clientClosed && !response.writableEnded) {
      const { value, done } = await reader.read()
      if (done) break
      if (value && value.byteLength > 0) {
        const writable = response.write(Buffer.from(value))
        if (!writable) {
          await new Promise<void>((resolve) => response.once('drain', resolve))
        }
      }
    }
  } finally {
    response.off('close', cancelReader)
    if (!response.writableEnded && !response.destroyed) response.end()
    await serialized.finalize?.()
  }
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
                response_mode: 'auto'
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
          `${(request.socket as Socket & { encrypted?: boolean }).encrypted ? 'https' : 'http'}://${hostHeader ?? `${host}:${port}`}`
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

          const closeMcpConnection =
            routedMethod === 'subscriptions/listen'
              ? connectionClose
              : true
          await sendSerializedWebResponse(
            response,
            result,
            closeMcpConnection
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
    console.log(`[MCP] Server listening on ${host}:${port}${endpoint}`)
  })

  httpServer.on('error', (error: Error) => {
    console.error('[MCP] Server error:', error)
    Blockbench.showQuickMessage(`MCP Server error: ${error.message}`, 3000)
  })

  return httpServer
}
