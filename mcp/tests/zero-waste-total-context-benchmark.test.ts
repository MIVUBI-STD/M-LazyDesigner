import { describe, expect, test } from "bun:test";
import { runZeroWasteTotalContextBenchmark } from "@/scripts/benchmark-zero-waste-total-context";

let reportPromise: ReturnType<typeof runZeroWasteTotalContextBenchmark> | null = null;
function report() {
  reportPromise ??= runZeroWasteTotalContextBenchmark();
  return reportPromise;
}

describe("Zero-Waste total-context proxy benchmark", () => {
  test("separates static prefix, dynamic workflow, and compaction instead of inventing token totals", async () => {
    const result = await report();

    expect(result.proof_scope).toContain("must not be summed into model tokens");
    expect(result.static_prefix.task_classes.system_development.bytes).toBeGreaterThan(0);
    expect(
      result.static_prefix.task_classes.geometry_authoring
        .stable_prefix_candidate_sha256
    ).toMatch(/^[a-f0-9]{64}$/);
    expect(result.dynamic_workflow.quality_preserved).toBe(true);
    expect(result.dynamic_workflow.optimized_bytes).toBeLessThan(
      result.dynamic_workflow.baseline_bytes
    );
    expect(result.dynamic_workflow.optimized_calls).toBeLessThan(
      result.dynamic_workflow.baseline_calls
    );
    expect(result.live_measurement_required.actual_token_claim).toBe(false);
  }, 25_000);

  test("reserves Control continuation headroom and produces a smaller compaction checkpoint", async () => {
    const result = await report();

    expect(result.control_headroom.continuation_reserve_proxy_bytes).toBeGreaterThan(0);
    expect(result.control_headroom.continuation_reserve_proxy_bytes).toBeLessThan(
      result.control_headroom.envelope_proxy_bytes
    );
    expect(result.compaction_checkpoint.checkpoint_bytes).toBeLessThan(
      result.compaction_checkpoint.full_internal_bytes
    );
    expect(result.compaction_checkpoint.schema).toBe(
      "lazydesigner-continuation-v1"
    );
  }, 25_000);
});
