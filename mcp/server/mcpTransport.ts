import {
  createMcpHandler,
  isLegacyRequest,
  WebStandardStreamableHTTPServerTransport,
} from "@modelcontextprotocol/server";
import type { ServerResponse } from "node:http";

import {
  registerPromptsOnServer,
  registerResourcesOnServer,
  registerToolsOnServer,
} from "@/lib/factories";
import {
  DEFAULT_MCP_REGISTRATION_PROFILE,
  type McpRegistrationProfile,
} from "@/lib/capabilities/registrationProfile";
import {
  getActiveMcpAuthoringPhase,
  type McpAuthoringPhase,
} from "@/lib/capabilities/authoringStage";
import { sendNodeResponse } from "@/server/httpBoundary";
import { createServer as createMcpServer } from "@/server/server";
import { conformanceFixturesEnabled } from "@/server/conformanceFixtures";
import { getMcpSurfaceToolNames } from "@/server/runtime/registration";
import type { SerializedWebResponse } from "@/server/requestProtocol";

function createRequestServer (
  phase: McpAuthoringPhase,
  profile: McpRegistrationProfile,
  phaseScoped: boolean
) {
  const requestServer = createMcpServer(phase, profile);
  if (conformanceFixturesEnabled()) return requestServer;

  const scopedToolNames = phaseScoped
    ? getMcpSurfaceToolNames(profile, phase)
    : undefined;
  registerToolsOnServer(requestServer, scopedToolNames);
  registerResourcesOnServer(requestServer);
  registerPromptsOnServer(requestServer);
  return requestServer;
}

async function handleLegacyJsonMcpRequest (
  webRequest: Request,
  phase: McpAuthoringPhase,
  profile: McpRegistrationProfile,
  phaseScoped: boolean
): Promise<Response> {
  const requestServer = createRequestServer(phase, profile, phaseScoped);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await requestServer.connect(transport);

  try {
    return await transport.handleRequest(webRequest);
  } finally {
    await requestServer.close();
  }
}

export async function handleStatelessMcpRequest (
  webRequest: Request,
  phase: McpAuthoringPhase = getActiveMcpAuthoringPhase(),
  profile: McpRegistrationProfile = DEFAULT_MCP_REGISTRATION_PROFILE,
  phaseScoped: boolean = false
): Promise<SerializedWebResponse> {
  const modernHandler = createMcpHandler(
    () => createRequestServer(phase, profile, phaseScoped),
    {
      legacy: "reject",
      responseMode: "auto",
    }
  );

  let deferModernClose = false;
  try {
    const legacyRequest = await isLegacyRequest(webRequest);
    const webResponse = legacyRequest
      ? await handleLegacyJsonMcpRequest(
          webRequest,
          phase,
          profile,
          phaseScoped
        )
      : await modernHandler.fetch(webRequest);

    const responseHeaders: Record<string, string> = {};
    webResponse.headers.forEach((value: string, key: string) => {
      responseHeaders[key] = value;
    });

    const contentType = webResponse.headers.get("content-type") || "";
    if (
      !contentType &&
      webResponse.status !== 204 &&
      webResponse.status !== 202
    ) {
      responseHeaders["content-type"] = "application/json";
    }

    if (
      !legacyRequest &&
      contentType.includes("text/event-stream") &&
      webResponse.body
    ) {
      deferModernClose = true;
      return {
        status: webResponse.status,
        headers: responseHeaders,
        body: webResponse.body,
        finalize: async () => {
          await modernHandler.close();
        },
      };
    }

    return {
      status: webResponse.status,
      headers: responseHeaders,
      body: await webResponse.text(),
    };
  } finally {
    if (!deferModernClose) await modernHandler.close();
  }
}

export async function sendSerializedWebResponse (
  response: ServerResponse,
  serialized: SerializedWebResponse,
  closeConnection: boolean
): Promise<void> {
  if (typeof serialized.body === "string") {
    sendNodeResponse(
      response,
      serialized.status,
      serialized.headers,
      serialized.body,
      closeConnection
    );
    await serialized.finalize?.();
    return;
  }

  if (response.headersSent || response.writableEnded) {
    await serialized.finalize?.();
    return;
  }

  response.statusCode = serialized.status;
  for (const [key, value] of Object.entries(serialized.headers)) {
    if (key.toLowerCase() === "content-length") continue;
    response.setHeader(key, value);
  }
  if (closeConnection) response.setHeader("connection", "close");

  const reader = serialized.body.getReader();
  let clientClosed = false;
  const cancelReader = () => {
    clientClosed = true;
    void reader.cancel().catch(() => {});
  };
  response.once("close", cancelReader);

  try {
    while (!clientClosed && !response.writableEnded) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value && value.byteLength > 0) {
        const writable = response.write(Buffer.from(value));
        if (!writable) {
          await new Promise<void>((resolve) =>
            response.once("drain", resolve)
          );
        }
      }
    }
  } finally {
    response.off("close", cancelReader);
    if (!response.writableEnded && !response.destroyed) response.end();
    await serialized.finalize?.();
  }
}