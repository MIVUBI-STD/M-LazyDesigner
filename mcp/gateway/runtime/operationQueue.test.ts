import { describe, expect, test } from "bun:test";
import { GatewayOperationQueue } from "./operationQueue";
import { GatewayBackendError } from "./backendContract";

describe("Gateway operation queue", () => {
  test("serializes operations and records metrics", async () => {
    const queue = new GatewayOperationQueue(2);
    const order: string[] = [];

    const first = queue.run(async () => {
      order.push("first:start");
      await new Promise((resolve) => setTimeout(resolve, 5));
      order.push("first:end");
      return 1;
    });

    const second = queue.run(async () => {
      order.push("second:start");
      order.push("second:end");
      return 2;
    });

    expect(await first).toBe(1);
    expect(await second).toBe(2);
    expect(order).toEqual([
      "first:start",
      "first:end",
      "second:start",
      "second:end",
    ]);

    expect(queue.snapshot()).toMatchObject({
      active: 0,
      queued: 0,
      completed: 2,
      failed: 0,
      rejected_busy: 0,
    });
  });

  test("rejects work beyond configured queue depth", async () => {
    const queue = new GatewayOperationQueue(0);
    let release!: () => void;
    const blocker = new Promise<void>((resolve) => {
      release = resolve;
    });

    const first = queue.run(async () => {
      await blocker;
    });

    await expect(queue.run(async () => undefined)).rejects.toBeInstanceOf(
      GatewayBackendError
    );
    release();
    await first;
    expect(queue.snapshot().rejected_busy).toBe(1);
  });

  test("expires queued work before execution without reporting unknown mutation state", async () => {
    const queue = new GatewayOperationQueue(2, 20);
    let release!: () => void;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const executed: string[] = [];

    const first = queue.run(async () => {
      executed.push("first");
      markStarted();
      await gate;
      return "first";
    });
    await started;
    const expired = queue.run(async () => {
      executed.push("expired");
      return "should-not-run";
    });
    try {
      await expect(expired).rejects.toMatchObject({
        code: "GATEWAY_QUEUE_EXPIRED",
        safeToRetry: true,
        details: { executed: false, queue_wait_timeout_ms: 20 },
      });
      expect(executed).toEqual(["first"]);
      expect(queue.snapshot()).toMatchObject({
        active: 1,
        queued: 0,
        expired_before_start: 1,
        cancelled_before_start: 0,
        failed: 0,
      });
    } finally {
      release();
      await first;
    }
    await expect(queue.run(async () => "recovered")).resolves.toBe("recovered");
    expect(executed).toEqual(["first"]);
  });

  test("aborted queued request immediately frees capacity and never executes", async () => {
    const queue = new GatewayOperationQueue(1, 1000);
    let release!: () => void;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const executed: string[] = [];
    const first = queue.run(async () => {
      executed.push("first");
      markStarted();
      await gate;
    });
    await started;
    const controller = new AbortController();
    const cancelled = queue.run(async () => {
      executed.push("cancelled");
    }, { signal: controller.signal });
    controller.abort();
    await expect(cancelled).rejects.toMatchObject({
      code: "GATEWAY_QUEUE_CANCELLED",
      safeToRetry: true,
      details: { executed: false },
    });
    const replacement = queue.run(async () => {
      executed.push("replacement");
    });
    release();
    await first;
    await replacement;
    expect(executed).toEqual(["first", "replacement"]);
    expect(queue.snapshot()).toMatchObject({
      completed: 2,
      cancelled_before_start: 1,
      queued: 0,
      active: 0,
    });
  });

  test("aborting an already-started mutation does not claim that it was cancelled", async () => {
    const queue = new GatewayOperationQueue(0, 1000);
    const controller = new AbortController();
    let release!: () => void;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const operation = queue.run(async () => {
      markStarted();
      await gate;
      return "applied";
    }, { signal: controller.signal });
    await started;
    controller.abort();
    release();
    await expect(operation).resolves.toBe("applied");
    expect(queue.snapshot()).toMatchObject({
      completed: 1,
      cancelled_before_start: 0,
      expired_before_start: 0,
    });
  });

  test("already aborted request is rejected before queue admission", async () => {
    const queue = new GatewayOperationQueue(0, 20);
    const controller = new AbortController();
    controller.abort();
    let executed = false;
    await expect(queue.run(async () => {
      executed = true;
    }, { signal: controller.signal })).rejects.toMatchObject({
      code: "GATEWAY_QUEUE_CANCELLED",
      details: { executed: false },
    });
    expect(executed).toBe(false);
    expect(queue.snapshot()).toMatchObject({
      queued: 0, active: 0, cancelled_before_start: 1,
    });
  });

  test("counts timeout-classified backend failures", async () => {
    const queue = new GatewayOperationQueue(1);
    await expect(
      queue.run(async () => {
        throw new GatewayBackendError(
          "BACKEND_UNAVAILABLE",
          "timeout",
          true,
          { timeout_ms: 1000 }
        );
      })
    ).rejects.toBeInstanceOf(GatewayBackendError);

    expect(queue.snapshot()).toMatchObject({
      failed: 1,
      timed_out: 1,
    });
  });
});
