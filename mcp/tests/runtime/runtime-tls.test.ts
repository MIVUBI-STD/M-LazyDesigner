import { expect, test } from "bun:test";
import { existsSync, readdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { IncomingMessage } from "node:http";
import { Agent as HttpsAgent, createServer, request as httpsRequest } from "node:https";
import { performance } from "node:perf_hooks";
import type { AddressInfo } from "node:net";
import { runtimeTlsPaths, DEFAULT_RUNTIME_URL, normalizeRuntimeUrl } from "../../lib/runtime/connection";
import { runtimeFetch } from "../../lib/runtime/fetch"; 
import {
  readRuntimeAuthorizationToken,
  runtimeAuthorizationPath,
} from "../../lib/runtime/authorization";
import { setupRuntimeTls } from "../../scripts/operations/setup-runtime-tls";
import {
  ensureRuntimeTlsIdentity,
  renewRuntimeTlsIdentity,
  runtimeTlsStatus,
} from "../../../distribution/runtime-tls";
import createNetServer from "../../server/net";
import { BlockitRuntimeBackend } from "../../gateway/runtime/backend";

test("TLS paths are absolute and the production default is HTTPS", () => {
  expect(DEFAULT_RUNTIME_URL).toBe("https://127.0.0.1:3000/bb-mcp");
  expect(runtimeTlsPaths({ APPDATA: "C:/profile" }, "win32").cert)
    .toBe("C:/profile/LazyDesigner/tls/cert.pem");
  expect(runtimeTlsPaths({ HOME: "/home/test" }, "linux").key)
    .toBe("/home/test/.config/LazyDesigner/tls/key.pem");
  expect(() => runtimeTlsPaths({ BLOCKIT_TLS_DIR: "relative" })).toThrow("absolute");
});


test("Runtime URL normalization is shared without loading Gateway internals", () => {
  expect(normalizeRuntimeUrl("https://localhost:3000/bb-mcp/"))
    .toBe("https://localhost:3000/bb-mcp");
  expect(normalizeRuntimeUrl("http://127.0.0.1:3000/bb-mcp"))
    .toBe("http://127.0.0.1:3000/bb-mcp");
  expect(() => normalizeRuntimeUrl("https://example.com/bb-mcp")).toThrow("loopback");
  expect(() => normalizeRuntimeUrl("https://user:password@localhost:3000/bb-mcp")).toThrow("credentials");
});

test("normal Gateway startup rejects HTTP configuration without breaking explicit HTTP fixtures", () => {
  const previous = process.env.BLOCKIT_RUNTIME_URL;
  try {
    process.env.BLOCKIT_RUNTIME_URL = "http://127.0.0.1:3000/bb-mcp";
    expect(() => new BlockitRuntimeBackend()).toThrow("requires HTTPS");
    expect(() => new BlockitRuntimeBackend(undefined)).toThrow("requires HTTPS");

    // Existing isolated stateless protocol fixtures explicitly inject HTTP.
    const fixture = new BlockitRuntimeBackend("http://127.0.0.1:3000/bb-mcp");
    expect(fixture.runtimeUrl).toBe("http://127.0.0.1:3000/bb-mcp");

    process.env.BLOCKIT_RUNTIME_URL = "https://localhost:3000/bb-mcp";
    expect(new BlockitRuntimeBackend().runtimeUrl).toBe(
      "https://localhost:3000/bb-mcp"
    );
  } finally {
    if (previous === undefined) delete process.env.BLOCKIT_RUNTIME_URL;
    else process.env.BLOCKIT_RUNTIME_URL = previous;
  }
});

test("HTTPS canonical handler and Gateway validate trust; hostile origin and untrusted peer fail", async () => {
  const directory = mkdtempSync(join(tmpdir(), "lazydesigner-tls-test-"));
  const previous = process.env.BLOCKIT_TLS_DIR;
  process.env.BLOCKIT_TLS_DIR = directory;
  let server: ReturnType<typeof createNetServer> | undefined;
  let backend: BlockitRuntimeBackend | undefined;
  try {
    const certPath = setupRuntimeTls();
    const cert = readFileSync(certPath, "utf8");
    expect(setupRuntimeTls()).toBe(certPath);
    expect(readFileSync(certPath, "utf8")).toBe(cert);
    const key = readFileSync(runtimeTlsPaths().key, "utf8");
    server = createNetServer({ createServer: (options, callback) =>
      createServer({ ...options, cert, key }, callback)
    }, {
      port: 0,
      endpoint: "/bb-mcp",
      authorizationToken: readRuntimeAuthorizationToken(
        { existsSync, readdirSync, readFileSync },
        runtimeAuthorizationPath()
      ),
    });
    if (!server.listening) await new Promise<void>((resolve, reject) => {
      server!.once("listening", resolve);
      server!.once("error", reject);
    });
    const url = `https://127.0.0.1:${(server.address() as AddressInfo).port}/bb-mcp`;
    expect((await runtimeFetch(`${url}/health`)).status).toBe(200);
    await expect(fetch(`${url}/health`)).rejects.toThrow();
    expect((await runtimeFetch(`${url}/health`, { headers: { origin: "https://evil.example" } })).status).toBe(403);
    await expect(runtimeFetch("https://example.com/bb-mcp")).rejects.toThrow("loopback");
    backend = new BlockitRuntimeBackend(url);
    await backend.searchCapabilities("", 1);
    const status = await backend.getStatus();
    expect(status.runtime.online).toBe(true);
    expect(status.runtime.mcp_client_ready).toBe(true);
    expect(status.runtime.protocol_era).toBe("modern");

    // Exercise the real certificate and bearer token with an independent
    // HTTPS client: reuse must preserve TLS verification and authentication.
    const token = readRuntimeAuthorizationToken(
      { existsSync, readdirSync, readFileSync },
      runtimeAuthorizationPath()
    );
    const agent = new HttpsAgent({ keepAlive: true, maxSockets: 1, ca: cert });
    const secureConnections = new Set<number>();
    const onSecureConnection = (request: IncomingMessage) => {
      expect(request.socket.remotePort).toBeDefined();
      secureConnections.add(request.socket.remotePort!);
    };
    server.on("request", onSecureConnection);
    try {
      const samples: number[] = [];
      for (let i = 0; i < 4; i++) {
        const started = performance.now();
        const observed = await new Promise<{ status: number; connection: string | undefined }>((resolve, reject) => {
          const request = httpsRequest(`${url}/health`, {
            method: "GET",
            agent,
            headers: { "x-lazydesigner-runtime-auth": token },
          }, (response) => {
            const chunks: Buffer[] = [];
            response.on("data", (chunk: Buffer) => chunks.push(chunk));
            response.once("error", reject);
            response.once("end", () => {
              const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { status?: string };
              expect(body.status).toBe("ok");
              resolve({
                status: response.statusCode ?? 0,
                connection: response.headers.connection,
              });
            });
          });
          request.once("error", reject);
          request.end();
        });
        samples.push(performance.now() - started);
        expect(observed.status).toBe(200);
        expect(secureConnections.size).toBe(1);
        expect(observed.connection).not.toBe("close");
      }
      expect(secureConnections.size).toBe(1);
      console.log(`[tls-connection-bench] https_health_reuse=3/4 secure_connections=1 sample_ms=${samples.map(n => n.toFixed(2)).join(",")}`);
    } finally {
      server.off("request", onSecureConnection);
      agent.destroy();
    }

    // A different local identity must not authenticate this listener.
    process.env.BLOCKIT_TLS_DIR = join(directory, "other");
    setupRuntimeTls();
    await expect(runtimeFetch(`${url}/health`, { headers: { connection: "close" } })).rejects.toThrow();
  } finally {
    await backend?.close();
    await server?.closeAndWait();
    if (previous === undefined) delete process.env.BLOCKIT_TLS_DIR;
    else process.env.BLOCKIT_TLS_DIR = previous;
    rmSync(directory, { recursive: true, force: true });
  }
}, 20_000);


test("explicit TLS renewal replaces a complete invalid identity without weakening default no-overwrite", () => {
  const directory = mkdtempSync(join(tmpdir(), "lazydesigner-tls-renew-"));
  const env = { ...process.env, BLOCKIT_TLS_DIR: directory };
  try {
    const initial = ensureRuntimeTlsIdentity(env, process.platform);
    expect(initial.ready).toBe(true);

    const paths = runtimeTlsPaths(env, process.platform);
    writeFileSync(paths.cert, "invalid certificate");
    writeFileSync(paths.key, "invalid private key");
    expect(runtimeTlsStatus(env, process.platform).ready).toBe(false);
    expect(() => ensureRuntimeTlsIdentity(env, process.platform)).toThrow();

    const renewed = renewRuntimeTlsIdentity(env, process.platform);
    expect(renewed.ready).toBe(true);
    expect(runtimeTlsStatus(env, process.platform).ready).toBe(true);
    expect(readFileSync(paths.cert, "utf8")).not.toBe("invalid certificate");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 20_000);

test("explicit TLS renewal still refuses an incomplete pair", () => {
  const directory = mkdtempSync(join(tmpdir(), "lazydesigner-tls-incomplete-"));
  const env = { ...process.env, BLOCKIT_TLS_DIR: directory };
  try {
    const paths = runtimeTlsPaths(env, process.platform);
    writeFileSync(paths.cert, "orphan certificate");
    expect(() => renewRuntimeTlsIdentity(env, process.platform)).toThrow("Incomplete Runtime TLS identity");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});