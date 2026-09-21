import { describe, expect, test } from "bun:test";
import {
  BlockitRuntimeBackend,
  GatewayBackendError,
} from "@/gateway/backend";

const RUNTIME_URL = "http://127.0.0.1:3000/bb-mcp";

function createBackend(overrides: {
  connectTimeoutMs?: number;
  callTimeoutMs?: number;
  closeTimeoutMs?: number;
  maxQueueDepth?: number;
} = {}) {
  return new BlockitRuntimeBackend(RUNTIME_URL, 1500, {
    connectTimeoutMs: 1000,
    callTimeoutMs: 1000,
    closeTimeoutMs: 100,
    maxQueueDepth: 1,
    ...overrides,
  });
}

describe("Gateway long-running reliability hardening", () => {
  test("serialized backend queue is bounded and recovers after pressure clears", async () => {
    const backend = createBackend({ maxQueueDepth: 1 });
    let releaseFirst: (() => void) | undefined;

    const first = (backend as any).runExclusive(
      () =>
        new Promise<void>((resolve) => {
          releaseFirst = resolve;
        })
    );

    await Promise.resolve();
    expect(releaseFirst).toBeDefined();

    const second = (backend as any).runExclusive(async () => "second");

    let busyError: unknown;
    try {
      await (backend as any).runExclusive(async () => "third");
    } catch (error) {
      busyError = error;
    }

    expect(busyError).toBeInstanceOf(GatewayBackendError);
    expect((busyError as GatewayBackendError).code).toBe("GATEWAY_BUSY");
    expect((busyError as GatewayBackendError).safeToRetry).toBe(true);

    releaseFirst!();
    await first;
    expect(await second).toBe("second");

    const status = (backend as any).operationStatus();
    expect(status.active).toBe(0);
    expect(status.queued).toBe(0);
    expect(status.max_queue_depth).toBe(1);
    expect(status.completed).toBe(2);
    expect(status.rejected_busy).toBe(1);
  });

  test("negotiated MCP era is retained for status diagnostics and cleared on disconnect", async () => {
    const source = await Bun.file("gateway/backend.ts").text();

    expect(source).toContain('versionNegotiation: { mode: "auto" }');
    expect(source).toContain("this.connectedProtocolEra = client.getProtocolEra() ?? null");
    expect(source).toContain("protocol_era: ready ? this.connectedProtocolEra : null");
    expect(source).toContain("this.connectedProtocolEra = null");
  });

  test("connect, catalog and capability calls use MCP-native request timeouts", async () => {
    const source = await Bun.file("gateway/backend.ts").text();
    const backendContract = await Bun.file(
      "gateway/runtime/backendContract.ts"
    ).text();

    expect(source).toContain(
      'versionNegotiation: { mode: "auto" }'
    );
    expect(source).toContain(
      "client.connect(transport, { timeout: this.connectTimeoutMs })"
    );
    expect(source).toMatch(
      /client\.listTools\([\s\S]*?\{ timeout: this\.connectTimeoutMs \}[\s\S]*?\)/
    );
    expect(source).toMatch(
      /this\.client!\.callTool\([\s\S]*?\{ timeout: this\.callTimeoutMs \}[\s\S]*?\)/
    );
    expect(backendContract).toContain("SdkErrorCode.RequestTimeout");
    expect(source).toContain("timedOut ? { timeout_ms: this.callTimeoutMs } : {}");
  });

  test("timeout accounting stays passive and does not create background work", async () => {
    const backend = createBackend();

    let timeoutError: unknown;
    try {
      await (backend as any).runExclusive(async () => {
        throw new GatewayBackendError(
          "BACKEND_UNAVAILABLE",
          "fixture timeout",
          true,
          { timeout_ms: 25 }
        );
      });
    } catch (error) {
      timeoutError = error;
    }

    expect(timeoutError).toBeInstanceOf(GatewayBackendError);

    const status = (backend as any).operationStatus();
    expect(status.active).toBe(0);
    expect(status.queued).toBe(0);
    expect(status.failed).toBe(1);
    expect(status.timed_out).toBe(1);
  });
});
