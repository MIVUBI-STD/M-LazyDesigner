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
