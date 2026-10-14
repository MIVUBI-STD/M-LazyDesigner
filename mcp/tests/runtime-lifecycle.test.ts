import { describe, expect, test } from "bun:test";
import {
  RuntimeGenerationRetiredError,
  RuntimeOperationQueueFullError,
  MAX_RUNTIME_WAITING_OPERATIONS,
  beginRuntimeGenerationTeardown,
  claimRuntimeGeneration,
  getRuntimeLifecycleSnapshot,
  markRuntimeGenerationState,
  runRuntimeOperationExclusive,
} from "@/lib/runtimeLifecycle";

function deferred(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("BlockIT plugin lifecycle coordinator", () => {
  test("a new generation receives the previous asynchronous teardown barrier", async () => {
    const first = claimRuntimeGeneration(`sha256:${"1".repeat(64)}`);
    const releaseCleanup = deferred();
    let cleaned = false;

    void beginRuntimeGenerationTeardown(first.generation, async () => {
      await releaseCleanup.promise;
      cleaned = true;
    });

    const second = claimRuntimeGeneration(`sha256:${"2".repeat(64)}`);
    let priorFinished = false;
    void second.priorTeardown.then(() => {
      priorFinished = true;
    });

    await Promise.resolve();
    expect(priorFinished).toBe(false);
    expect(cleaned).toBe(false);

    releaseCleanup.resolve();
    await second.priorTeardown;
    expect(cleaned).toBe(true);

    await beginRuntimeGenerationTeardown(second.generation, async () => {});
  });

  test("queued work from a retired generation cannot become a late mutation", async () => {
    const first = claimRuntimeGeneration(`sha256:${"3".repeat(64)}`);
    const started = deferred();
    const release = deferred();

    const active = runRuntimeOperationExclusive(first.generation, async () => {
      started.resolve();
      await release.promise;
      return "active-completed";
    });
    await started.promise;

    const staleQueued = runRuntimeOperationExclusive(first.generation, async () =>
      "must-not-run"
    );
    const second = claimRuntimeGeneration(`sha256:${"4".repeat(64)}`);

    const retired = Promise.allSettled([active, staleQueued]);
    release.resolve();
    expect(await retired).toEqual([
      { status: "rejected", reason: expect.any(RuntimeGenerationRetiredError) },
      { status: "rejected", reason: expect.any(RuntimeGenerationRetiredError) },
    ]);
    expect(
      await runRuntimeOperationExclusive(second.generation, async () => "new-generation")
    ).toBe("new-generation");

    await beginRuntimeGenerationTeardown(second.generation, async () => {});
  });

  test("global native admission rejects overload before execution and drains safely", async () => {
    const claim = claimRuntimeGeneration(`sha256:${"6".repeat(64)}`);
    const gate = deferred();
    let executed = 0;
    const pending = Array.from({ length: MAX_RUNTIME_WAITING_OPERATIONS + 1 }, (_, index) =>
      runRuntimeOperationExclusive(claim.generation, async () => {
        executed += 1;
        if (index === 0) await gate.promise;
        return index;
      })
    );

    try {
      await Promise.resolve();
      await expect(
        runRuntimeOperationExclusive(claim.generation, async () => {
          executed += 1;
          return -1;
        })
      ).rejects.toBeInstanceOf(RuntimeOperationQueueFullError);
      expect(executed).toBe(1);
    } finally {
      gate.resolve();
      await Promise.allSettled(pending);
      await beginRuntimeGenerationTeardown(claim.generation, async () => {});
    }
    expect(executed).toBe(MAX_RUNTIME_WAITING_OPERATIONS + 1);
  });

  test("lifecycle state updates are generation-owned and bounded", async () => {
    const claim = claimRuntimeGeneration(`sha256:${"5".repeat(64)}`);
    markRuntimeGenerationState(claim.generation, "running");

    expect(getRuntimeLifecycleSnapshot()).toMatchObject({
      owner_generation: claim.generation,
      build_identity: `sha256:${"5".repeat(64)}`,
      state: "running",
    });

    await beginRuntimeGenerationTeardown(claim.generation, async () => {});
    expect(getRuntimeLifecycleSnapshot()).toMatchObject({
      owner_generation: null,
      build_identity: null,
      state: "stopped",
    });
  });
});
