import { describe, expect, test } from "bun:test";
import { McpServer, WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/server";

const MCP_URL = "http://127.0.0.1:3000/bb-mcp";
// Current Codex legacy Streamable HTTP startup explicitly requests 2025-06-18.
// The current lock resolves SDK v1.25.3. GHSA-345p-7cg4-v4c7 affects shared
// server/transport reuse, so this fixture keeps BlockIT's request-owned pattern
// explicit until a Bun-capable checkout can canonically upgrade the lockfile.
const PROTOCOL_VERSION = "2025-06-18";

function createFixtureServer(): McpServer {
  const server = new McpServer({
    name: "blockit-p1-stateless-fixture",
    version: "1.0.0",
  });

  // Keep this transport fixture at the protocol-handler layer instead of using
  // McpServer.registerTool(). The latter's Zod-heavy generic inference can hit
  // TypeScript's instantiation-depth limit in an otherwise tiny test fixture.
  // These handlers still exercise the real SDK tools/list + tools/call protocol
  // flow that the stateless transport must carry between independent POSTs.
  server.server.registerCapabilities({ tools: {} });
  server.server.setRequestHandler('tools/list', async () => ({
    tools: [
      {
        name: "echo_fixture",
        description: "P1.4 stateless protocol fixture",
        inputSchema: {
          type: "object",
          properties: {
            value: { type: "string" },
          },
          required: ["value"],
          additionalProperties: false,
        },
      },
    ],
  }));
  server.server.setRequestHandler('tools/call', async (request) => {
    if (request.params.name !== "echo_fixture") {
      throw new Error(`Unexpected fixture tool: ${request.params.name}`);
    }

    const value = request.params.arguments?.value;
    if (typeof value !== "string") {
      throw new Error("echo_fixture requires a string value");
    }

    return {
      content: [{ type: "text" as const, text: value }],
    };
  });

  return server;
}

async function postWithFreshStatelessServer(
  message: unknown,
  options: { includeProtocolHeader?: boolean } = {}
): Promise<{ status: number; headers: Headers; text: string }> {
  const server = createFixtureServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);

  try {
    const headers = new Headers({
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
    });
    if (options.includeProtocolHeader) {
      headers.set("mcp-protocol-version", PROTOCOL_VERSION);
    }

    const response = await transport.handleRequest(
      new Request(MCP_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(message),
      })
    );

    return {
      status: response.status,
      headers: response.headers,
      text: await response.text(),
    };
  } finally {
    await server.close();
  }
}

function parseJson(text: string): Record<string, unknown> {
  return JSON.parse(text) as Record<string, unknown>;
}

describe("P1.4 pinned-SDK stateless request sequence", () => {
  test("fresh server/transport per POST supports initialize then independent follow-up requests", async () => {
    const initialize = await postWithFreshStatelessServer({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: {
          name: "blockit-p1-test-client",
          version: "1.0.0",
        },
      },
    });

    expect(initialize.status).toBe(200);
    expect(initialize.headers.get("mcp-session-id")).toBeNull();
    const initializeJson = parseJson(initialize.text);
    expect(initializeJson.jsonrpc).toBe("2.0");
    expect(initializeJson.id).toBe(1);
    expect(
      (initializeJson.result as { protocolVersion?: string }).protocolVersion
    ).toBe(PROTOCOL_VERSION);

    const initialized = await postWithFreshStatelessServer(
      {
        jsonrpc: "2.0",
        method: "notifications/initialized",
        params: {},
      },
      { includeProtocolHeader: true }
    );

    expect(initialized.status).toBe(202);
    expect(initialized.headers.get("mcp-session-id")).toBeNull();

    const toolsList = await postWithFreshStatelessServer(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      },
      { includeProtocolHeader: true }
    );

    expect(toolsList.status).toBe(200);
    expect(toolsList.headers.get("mcp-session-id")).toBeNull();
    const toolsListJson = parseJson(toolsList.text);
    const tools = (toolsListJson.result as { tools?: Array<{ name?: string }> }).tools;
    expect(tools?.map((tool) => tool.name)).toContain("echo_fixture");

    const toolCall = await postWithFreshStatelessServer(
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "echo_fixture",
          arguments: { value: "stateless-ok" },
        },
      },
      { includeProtocolHeader: true }
    );

    expect(toolCall.status).toBe(200);
    expect(toolCall.headers.get("mcp-session-id")).toBeNull();
    const toolCallJson = parseJson(toolCall.text);
    expect(
      (toolCallJson.result as { content?: Array<{ type?: string; text?: string }> })
        .content
    ).toEqual([{ type: "text", text: "stateless-ok" }]);
  });

  test("follow-up requests remain independent of any server-issued protocol session", async () => {
    const firstList = await postWithFreshStatelessServer(
      {
        jsonrpc: "2.0",
        id: 10,
        method: "tools/list",
        params: {},
      },
      { includeProtocolHeader: true }
    );
    const secondList = await postWithFreshStatelessServer(
      {
        jsonrpc: "2.0",
        id: 11,
        method: "tools/list",
        params: {},
      },
      { includeProtocolHeader: true }
    );

    expect(firstList.status).toBe(200);
    expect(secondList.status).toBe(200);
    expect(firstList.headers.get("mcp-session-id")).toBeNull();
    expect(secondList.headers.get("mcp-session-id")).toBeNull();
  });

  test("concurrent requests with colliding JSON-RPC ids stay isolated", async () => {
    const call = (value: string) =>
      postWithFreshStatelessServer(
        {
          jsonrpc: "2.0",
          id: 42,
          method: "tools/call",
          params: {
            name: "echo_fixture",
            arguments: { value },
          },
        },
        { includeProtocolHeader: true }
      );

    const [first, second] = await Promise.all([
      call("client-a"),
      call("client-b"),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.headers.get("mcp-session-id")).toBeNull();
    expect(second.headers.get("mcp-session-id")).toBeNull();

    const firstJson = parseJson(first.text);
    const secondJson = parseJson(second.text);
    expect(firstJson.id).toBe(42);
    expect(secondJson.id).toBe(42);
    expect(
      (firstJson.result as { content?: Array<{ type?: string; text?: string }> })
        .content
    ).toEqual([{ type: "text", text: "client-a" }]);
    expect(
      (secondJson.result as { content?: Array<{ type?: string; text?: string }> })
        .content
    ).toEqual([{ type: "text", text: "client-b" }]);
  });
});
