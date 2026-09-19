import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:https";
import type { AddressInfo } from "node:net";
import { runtimeTlsPaths, DEFAULT_RUNTIME_URL } from "../lib/runtimeConnection";
import { runtimeFetch } from "../lib/runtimeFetch";
import { setupRuntimeTls } from "../scripts/setup-runtime-tls";
import {
  ensureRuntimeTlsIdentity,
  renewRuntimeTlsIdentity,
  runtimeTlsStatus,
} from "../distribution/runtime-tls";
import createNetServer from "../server/net";
import { BlockitRuntimeBackend } from "../gateway/backend";

test("TLS paths are absolute and the production default is HTTPS", () => {
  expect(DEFAULT_RUNTIME_URL).toBe("https://127.0.0.1:3000/bb-mcp");
  expect(runtimeTlsPaths({ APPDATA: "C:/profile" }, "win32").cert)
    .toBe("C:/profile/LazyDesigner/tls/cert.pem");
  expect(runtimeTlsPaths({ HOME: "/home/test" }, "linux").key)
    .toBe("/home/test/.config/LazyDesigner/tls/key.pem");
  expect(() => runtimeTlsPaths({ BLOCKIT_TLS_DIR: "relative" })).toThrow("absolute");
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
    }, { port: 0, endpoint: "/bb-mcp" });
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
