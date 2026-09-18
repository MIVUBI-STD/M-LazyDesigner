import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import createNetServer, {
  normalizeBuildIdentity,
  type NetServer,
} from "@/server/net";

const HOST = "127.0.0.1";
const ENDPOINT = "/bb-mcp";

let server: NetServer;
let healthUrl = "";

beforeAll(async () => {
  server = createNetServer(
    { createServer: (options, callback) => createHttpServer(options, callback) },
    { port: 0, endpoint: ENDPOINT, host: HOST }
  );

  if (!server.listening) {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
  }

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected a TCP listener for the health identity fixture.");
  }
  healthUrl = `http://${HOST}:${(address as AddressInfo).port}${ENDPOINT}/health`;
});

afterAll(async () => {
  if (!server?.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});

async function readHealth(): Promise<Record<string, unknown>> {
  const response = await fetch(healthUrl, {
    headers: { connection: "close" },
  });
  expect(response.status).toBe(200);
  return (await response.json()) as Record<string, unknown>;
}

describe("MCP health build identity", () => {
  test("build identity accepts only the injected SHA-256 form", () => {
    const valid = `sha256:${"a".repeat(64)}`;
    expect(normalizeBuildIdentity(valid)).toBe(valid);

    for (const invalid of [
      undefined,
      null,
      "",
      "0.1.0",
      `sha256:${"a".repeat(63)}`,
      `sha256:${"A".repeat(64)}`,
      123,
    ]) {
      expect(normalizeBuildIdentity(invalid)).toBe("source");
    }
  });

  test("source health separates build, version, and process identity", async () => {
    const first = await readHealth();
    const second = await readHealth();
    const product = first.product as { version?: unknown };

    expect(first.build_identity).toBe("source");
    expect(typeof product.version).toBe("string");
    expect(first.build_identity).not.toBe(product.version);

    expect(typeof first.instance_id).toBe("string");
    expect((first.instance_id as string).length).toBeGreaterThan(0);
    expect(first.instance_id).toBe(second.instance_id);

    expect(typeof first.startup_time).toBe("string");
    expect(Number.isFinite(Date.parse(first.startup_time as string))).toBe(true);
    expect(first.startup_time).toBe(second.startup_time);
    expect(first.build_identity).toBe(second.build_identity);
  });
});
