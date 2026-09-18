import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createConnection, createServer as createTcpServer, type AddressInfo, type Socket } from "node:net";
import { performance } from "node:perf_hooks";
import { z } from "zod";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createTool } from "@/lib/factories";
import createNetServer, { type NetServer } from "@/server/net";
import { MCP_SERVER_INSTRUCTIONS } from "@/server/server";

const HOST = "127.0.0.1";
const ENDPOINT = "/bb-mcp";
// Match the current Codex legacy Streamable HTTP initialization revision.
const PROTOCOL_VERSION = "2025-06-18";
const FIXTURE_TOOL = "p1_raw_net_echo_fixture";

let server: NetServer;
let baseUrl = "";

// This transport test keeps one tiny fixture so protocol assertions stay focused.
// The full default registry is independently import-tested outside Blockbench;
// runtime-only globals such as Painter are resolved only during tool execution.
createTool(
  FIXTURE_TOOL,
  {
    description: "P1.4 raw-net protocol fixture",
    parameters: z.object({ value: z.string() }),
    async execute({ value }) {
      return value;
    },
  },
  "experimental"
);

function closedHeaders(extra: Record<string, string> = {}): Headers {
  return new Headers({
    connection: "close",
    ...extra,
  });
}

async function postMcp(
  body: unknown,
  options: {
    protocolVersion?: boolean;
    origin?: string;
  } = {}
): Promise<Response> {
  const headers = closedHeaders({
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
  });
  if (options.protocolVersion) {
    headers.set("mcp-protocol-version", PROTOCOL_VERSION);
  }
  if (options.origin) {
    headers.set("origin", options.origin);
  }

  return fetch(`${baseUrl}${ENDPOINT}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function bodyJson(response: Response): Promise<Record<string, unknown>> {
  return JSON.parse(await response.text()) as Record<string, unknown>;
}

async function rawHttpRequest(request: string): Promise<string> {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected active TCP listener.");
  }

  return await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const socket = createConnection({ host: HOST, port: address.port });
    const deadline = setTimeout(() => {
      socket.destroy();
      reject(new Error("Raw HTTP request did not complete."));
    }, 2500);

    const finish = (error?: Error) => {
      clearTimeout(deadline);
      if (error) reject(error);
      else resolve(Buffer.concat(chunks).toString("utf8"));
    };

    socket.on("data", (chunk: Buffer) => chunks.push(chunk));
    socket.once("error", finish);
    socket.once("end", () => finish());
    socket.once("connect", () => socket.write(request));
  });
}

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(fraction * sorted.length) - 1);
  return sorted[index] ?? 0;
}

async function measureRequestSequence(
  startId: number,
  count: number
): Promise<number[]> {
  const samples: number[] = [];

  for (let i = 0; i < count; i++) {
    const baseId = startId + i * 3;
    const started = performance.now();

    const initializeResponse = await postMcp({
      jsonrpc: "2.0",
      id: baseId,
      method: "initialize",
      params: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: `p1-benchmark-${i}`, version: "1.0.0" },
      },
    });
    expect(initializeResponse.status).toBe(200);

    const listResponse = await postMcp(
      {
        jsonrpc: "2.0",
        id: baseId + 1,
        method: "tools/list",
        params: {},
      },
      { protocolVersion: true }
    );
    expect(listResponse.status).toBe(200);

    const callResponse = await postMcp(
      {
        jsonrpc: "2.0",
        id: baseId + 2,
        method: "tools/call",
        params: {
          name: FIXTURE_TOOL,
          arguments: { value: `raw-benchmark-${i}` },
        },
      },
      { protocolVersion: true }
    );
    expect(callResponse.status).toBe(200);

    samples.push(performance.now() - started);
  }

  return samples;
}

beforeAll(async () => {
  server = createNetServer(
    {
      createServer: (callback) => createTcpServer(callback),
    },
    {
      port: 0,
      endpoint: ENDPOINT,
      host: HOST,
    }
  );

  if (!server.listening) {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
  }

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected an IPv4 TCP listener for the P1.4 integration fixture.");
  }

  const tcpAddress = address as AddressInfo;
  expect(tcpAddress.address).toBe(HOST);
  baseUrl = `http://${HOST}:${tcpAddress.port}`;
});

afterAll(async () => {
  await server?.closeAndWait();
});

describe("P1.4 raw-net stateless integration", () => {
  test("listener binds to loopback and health exposes stateless JSON mode", async () => {
    const address = server.address();
    expect(address).not.toBeNull();
    expect(typeof address).not.toBe("string");
    if (!address || typeof address === "string") return;

    expect(address.address).toBe(HOST);

    const response = await fetch(`${baseUrl}${ENDPOINT}/health`, {
      headers: closedHeaders(),
    });
    expect(response.status).toBe(200);

    const body = await bodyJson(response);
    expect(body.transport).toEqual({
      mode: "stateless",
      response_mode: "json",
    });
    expect(body).not.toHaveProperty("sessions");
  });

  test("outer HTTP owner rejects standalone GET and DELETE", async () => {
    const getResponse = await fetch(`${baseUrl}${ENDPOINT}`, {
      method: "GET",
      headers: closedHeaders({ accept: "text/event-stream" }),
    });
    expect(getResponse.status).toBe(405);

    const deleteResponse = await fetch(`${baseUrl}${ENDPOINT}`, {
      method: "DELETE",
      headers: closedHeaders(),
    });
    expect(deleteResponse.status).toBe(405);
  });

  test("invalid present Origin is a real HTTP 403 before MCP dispatch", async () => {
    const response = await postMcp(
      {
        jsonrpc: "2.0",
        id: 90,
        method: "initialize",
        params: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: "p1-net-fixture", version: "1.0.0" },
        },
      },
      { origin: "https://example.invalid" }
    );

    expect(response.status).toBe(403);
    const body = await bodyJson(response);
    expect((body.error as { message?: string }).message).toContain("invalid Origin");
  });

  test("HTTP/1.1 requests fail closed on missing or duplicate routing headers", async () => {
    const missingHost = await rawHttpRequest(
      `GET ${ENDPOINT}/health HTTP/1.1\r\nConnection: close\r\n\r\n`
    );
    expect(missingHost.startsWith("HTTP/1.1 400 ")).toBe(true);
    expect(missingHost).toContain("malformed or ambiguous HTTP headers");

    const duplicateHost = await rawHttpRequest(
      `GET ${ENDPOINT}/health HTTP/1.1\r\nHost: ${HOST}\r\nHost: localhost\r\nConnection: close\r\n\r\n`
    );
    expect(duplicateHost.startsWith("HTTP/1.1 400 ")).toBe(true);

    const duplicateOrigin = await rawHttpRequest(
      `GET ${ENDPOINT}/health HTTP/1.1\r\nHost: ${HOST}\r\nOrigin: http://localhost\r\nOrigin: http://127.0.0.1\r\nConnection: close\r\n\r\n`
    );
    expect(duplicateOrigin.startsWith("HTTP/1.1 400 ")).toBe(true);
  });

  test("malformed header lines fail before MCP or health dispatch", async () => {
    const response = await rawHttpRequest(
      `GET ${ENDPOINT}/health HTTP/1.1\r\nHost: ${HOST}\r\nMalformedHeader\r\nConnection: close\r\n\r\n`
    );
    expect(response.startsWith("HTTP/1.1 400 ")).toBe(true);
    expect(response).toContain("malformed or ambiguous HTTP headers");
  });

  test("modern 2026 client negotiates and calls tools on the same Runtime endpoint", async () => {
    const client = new Client(
      { name: "p1-modern-net-fixture", version: "1.0.0" },
      { versionNegotiation: { mode: { pin: "2026-07-28" } } }
    );
    const transport = new StreamableHTTPClientTransport(
      new URL(`${baseUrl}${ENDPOINT}`)
    );

    try {
      await client.connect(transport);
      expect(client.getProtocolEra()).toBe("modern");

      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain(FIXTURE_TOOL);

      const result = await client.callTool({
        name: FIXTURE_TOOL,
        arguments: { value: "modern-2026-ok" },
      });
      expect(result.content).toEqual([
        { type: "text", text: "modern-2026-ok" },
      ]);
    } finally {
      await client.close();
    }
  });

  test("initialize exposes compact capability-oriented namespace instructions", async () => {
    const initializeResponse = await postMcp({
      jsonrpc: "2.0",
      id: 100,
      method: "initialize",
      params: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "p1-instructions-fixture", version: "1.0.0" },
      },
    });

    expect(initializeResponse.status).toBe(200);
    const initializeBody = await bodyJson(initializeResponse);
    const result = initializeBody.result as {
      protocolVersion?: string;
      instructions?: string;
    };
    expect(result.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(result.instructions).toBe(MCP_SERVER_INSTRUCTIONS);
    expect(MCP_SERVER_INSTRUCTIONS.length).toBeLessThan(700);

    const instructions = MCP_SERVER_INSTRUCTIONS.toLowerCase();
    for (const term of [
      "bedrock",
      "cube",
      "texture",
      "pbr",
      "animation",
      "keyframe",
      "locator",
      "history",
      "export",
    ]) {
      expect(instructions).toContain(term);
    }
  });

  test("initialize, tools/list and tools/call pass through the real raw HTTP parser without sessions", async () => {
    const initializeResponse = await postMcp({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "p1-net-fixture", version: "1.0.0" },
      },
    });

    expect(initializeResponse.status).toBe(200);
    expect(initializeResponse.headers.get("mcp-session-id")).toBeNull();
    const initializeBody = await bodyJson(initializeResponse);
    expect(
      (initializeBody.result as { protocolVersion?: string }).protocolVersion
    ).toBe(PROTOCOL_VERSION);

    const listTools = async (id: number) => {
      const response = await postMcp(
        {
          jsonrpc: "2.0",
          id,
          method: "tools/list",
          params: {},
        },
        { protocolVersion: true }
      );
      const body = await bodyJson(response);
      const tools = (body.result as { tools?: Array<{ name?: string }> }).tools ?? [];
      return { response, names: tools.map((tool) => tool.name) };
    };

    const first = await listTools(2);
    const second = await listTools(3);

    expect(first.response.status).toBe(200);
    expect(second.response.status).toBe(200);
    expect(first.response.headers.get("mcp-session-id")).toBeNull();
    expect(second.response.headers.get("mcp-session-id")).toBeNull();
    expect(first.names).toContain(FIXTURE_TOOL);
    expect(second.names).toEqual(first.names);

    const callResponse = await postMcp(
      {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: FIXTURE_TOOL,
          arguments: { value: "raw-net-ok" },
        },
      },
      { protocolVersion: true }
    );
    expect(callResponse.status).toBe(200);
    expect(callResponse.headers.get("mcp-session-id")).toBeNull();
    const callBody = await bodyJson(callResponse);
    expect(
      (callBody.result as { content?: Array<{ type?: string; text?: string }> })
        .content
    ).toEqual([{ type: "text", text: "raw-net-ok" }]);
  });

  test("fragmented headers and UTF-8 bodies wait for new data before dispatch", async () => {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected active TCP listener.");
    }

    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 75,
      method: "tools/call",
      params: { name: FIXTURE_TOOL, arguments: { value: "fragmented ✓" } },
    });
    const header =
      `POST ${ENDPOINT} HTTP/1.1\r\nHost: ${HOST}\r\n` +
      "Content-Type: application/json\r\nAccept: application/json, text/event-stream\r\n" +
      `MCP-Protocol-Version: ${PROTOCOL_VERSION}\r\n` +
      `Content-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n`;
    const request = Buffer.from(header + body);
    const utf8Split = request.indexOf(Buffer.from("✓")) + 1;
    expect(utf8Split).toBeGreaterThan(Buffer.byteLength(header));
    const fragments = [
      request.subarray(0, 8),
      request.subarray(8, utf8Split),
      request.subarray(utf8Split),
    ];

    const response = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      let peer: Socket | undefined;
      let socket: Socket;
      let nextFragment = 1;
      let receivedBytes = 0;
      let sentBytes = fragments[0].length;
      let settled = false;
      let nextWrite: ReturnType<typeof setTimeout> | undefined;

      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(deadline);
        if (nextWrite !== undefined) clearTimeout(nextWrite);
        server.off("connection", onConnection);
        peer?.off("data", onPeerData);
        socket.destroy();
        peer?.destroy();
        if (error) reject(error);
        else resolve(Buffer.concat(chunks).toString("utf8"));
      };
      const onPeerData = (chunk: Buffer) => {
        receivedBytes += chunk.length;
        if (receivedBytes < sentBytes || nextFragment >= fragments.length) return;
        const fragment = fragments[nextFragment++];
        sentBytes += fragment.length;
        // Only feed the next fragment after the real parser has observed the
        // previous one and yielded; TCP coalescing cannot hide the incomplete read.
        nextWrite = setTimeout(() => {
          if (!socket.destroyed) socket.write(fragment);
        }, 0);
      };
      const onConnection = (accepted: Socket) => {
        peer = accepted;
        peer.on("data", onPeerData);
      };
      const deadline = setTimeout(
        () => finish(new Error("Fragmented MCP request did not complete.")),
        2500
      );
      server.once("connection", onConnection);
      socket = createConnection({ host: HOST, port: address.port });
      socket.setNoDelay(true);
      socket.on("data", (chunk: Buffer) => chunks.push(chunk));
      socket.once("error", finish);
      socket.once("end", () => finish());
      socket.once("close", () => finish());
      socket.once("connect", () => socket.write(fragments[0]));
    });

    expect(response.startsWith("HTTP/1.1 200 ")).toBe(true);
    expect(response.match(/HTTP\/1\.1 /g)).toHaveLength(1);
    const payload = JSON.parse(response.slice(response.indexOf("\r\n\r\n") + 4));
    expect(payload.id).toBe(75);
    expect(payload.result.content).toEqual([{ type: "text", text: "fragmented ✓" }]);
  });

  test("active keep-alive sockets can be closed deterministically", async () => {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected active TCP listener.");
    }

    const socket = createConnection({ host: HOST, port: address.port });
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("error", reject);
    });

    const responseReceived = new Promise<void>((resolve, reject) => {
      socket.once("data", () => resolve());
      socket.once("error", reject);
    });
    socket.write(
      `GET ${ENDPOINT}/health HTTP/1.1\r\nHost: ${HOST}\r\nConnection: keep-alive\r\n\r\n`
    );
    await responseReceived;
    expect(socket.destroyed).toBe(false);

    const closed = new Promise<void>((resolve) => socket.once("close", () => resolve()));
    server.closeActiveSockets();
    await closed;
    expect(socket.destroyed).toBe(true);
  });

  test("MCP responses close the client socket so a stuck request cannot poison reuse", async () => {
    const response = await fetch(`${baseUrl}${ENDPOINT}`, {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        connection: "keep-alive",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 50,
        method: "initialize",
        params: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: "p1-connection-reset", version: "1.0.0" },
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("connection")).toBe("close");
  });

  test("p95 request-sequence latency remains within the transport budget", async () => {
    const samples = await measureRequestSequence(2000, 24);
    const p95 = percentile(samples, 0.95);

    console.log(`[mcp-bench] request-sequence p95=${p95.toFixed(2)}ms`);

    expect(samples).toHaveLength(24);
    expect(p95).toBeLessThanOrEqual(300);
  });
});
