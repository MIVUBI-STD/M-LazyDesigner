import { describe, expect, test } from "bun:test";
import { BlockitRuntimeBackend } from "./backend";

describe("Gateway operation observability", () => {
  test("status exposes bounded queue and duration metrics without a second telemetry system", async () => {
    const backend = new BlockitRuntimeBackend();
    const internal = backend as unknown as {
      operationStatus(): {
        last_queue_wait_ms: number | null;
        max_queue_wait_ms: number;
        last_duration_ms: number | null;
        max_duration_ms: number;
        metric_sample_limit: number;
        queue_wait_sample_count: number;
        duration_sample_count: number;
        queue_wait_p50_ms: number | null;
        duration_p95_ms: number | null;
      };
      runExclusive<T>(operation: () => Promise<T>): Promise<T>;
    };

    expect(internal.operationStatus()).toMatchObject({
      last_queue_wait_ms: null,
      max_queue_wait_ms: 0,
      last_duration_ms: null,
      max_duration_ms: 0,
      metric_sample_limit: 64,
      queue_wait_sample_count: 0,
      duration_sample_count: 0,
      queue_wait_p50_ms: null,
      duration_p95_ms: null,
    });

    await internal.runExclusive(async () => undefined);

    const measured = internal.operationStatus();
    expect(measured.last_queue_wait_ms).toBeGreaterThanOrEqual(0);
    expect(measured.max_queue_wait_ms).toBeGreaterThanOrEqual(
      measured.last_queue_wait_ms ?? 0
    );
    expect(measured.last_duration_ms).toBeGreaterThanOrEqual(0);
    expect(measured.max_duration_ms).toBeGreaterThanOrEqual(
      measured.last_duration_ms ?? 0
    );
    expect(measured.queue_wait_sample_count).toBe(1);
    expect(measured.duration_sample_count).toBe(1);
    expect(measured.queue_wait_p50_ms).toBeGreaterThanOrEqual(0);
    expect(measured.duration_p95_ms).toBeGreaterThanOrEqual(0);
  });
});
