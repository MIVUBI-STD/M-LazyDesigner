import { describe, expect, test } from "bun:test";
import { runMcpEfficiencyScorecard } from "@/scripts/measure-mcp-efficiency";

describe("MCP efficiency scorecard", () => {
  test("measures all prioritized hot paths with preserved quality", () => {
    const report = runMcpEfficiencyScorecard();

    expect(report.scores.map((item) => item.id)).toEqual([
      "geometry_coherent_cube_batch",
      "animation_coherent_keyframe_batch",
      "texture_atomic_region_transaction",
      "receipt_only_hierarchy_continuation",
      "unknown_target_focused_discovery",
    ]);
    expect(report.aggregate.quality_preserved).toBe(true);

    for (const score of report.scores) {
      expect(score.quality_preserved, score.id).toBe(true);
      expect(score.optimized_calls, score.id).toBeLessThanOrEqual(
        score.baseline_calls
      );
      expect(
        score.optimized_payload_bytes,
        score.id
      ).toBeLessThan(score.baseline_payload_bytes);
    }
  });

  test("batch-capable domains collapse micro-mutations without deleting verification", () => {
    const byId = new Map(
      runMcpEfficiencyScorecard().scores.map((item) => [item.id, item] as const)
    );

    for (const id of [
      "geometry_coherent_cube_batch",
      "animation_coherent_keyframe_batch",
      "texture_atomic_region_transaction",
    ]) {
      const score = byId.get(id)!;
      expect(score.optimized_mutation_calls, id).toBe(1);
      expect(score.optimized_mutation_calls, id).toBeLessThan(
        score.baseline_mutation_calls
      );
      expect(score.optimized_verification_calls, id).toBe(
        score.baseline_verification_calls
      );
    }
  });

  test("receipt continuation removes only redundant readback", () => {
    const score = runMcpEfficiencyScorecard().scores.find(
      (item) => item.id === "receipt_only_hierarchy_continuation"
    )!;

    expect(score.baseline_inspection_calls).toBe(1);
    expect(score.optimized_inspection_calls).toBe(0);
    expect(score.optimized_mutation_calls).toBe(1);
    expect(score.quality_preserved).toBe(true);
  });

  test("focused discovery preserves the one identity read required for safe mutation", () => {
    const score = runMcpEfficiencyScorecard().scores.find(
      (item) => item.id === "unknown_target_focused_discovery"
    )!;

    expect(score.baseline_inspection_calls).toBe(2);
    expect(score.optimized_inspection_calls).toBe(1);
    expect(score.optimized_mutation_calls).toBe(1);
    expect(score.quality_preserved).toBe(true);
  });

  test("opportunity register separates implemented savings from unproven helpers", () => {
    const report = runMcpEfficiencyScorecard();
    const byId = new Map(
      report.opportunity_register.map((item) => [item.id, item] as const)
    );

    expect(byId.get("geometry_coherent_cube_batch")?.status).toBe("implemented");
    expect(byId.get("animation_coherent_keyframe_batch")?.status).toBe("implemented");
    expect(byId.get("texture_atomic_region_transaction")?.status).toBe("implemented");
    expect(byId.get("rig_locator_cohort_mutation")?.status).toBe("evidence_required");
    expect(byId.get("render_target_native_adapter")?.status).toBe("blocked_by_stable_api");
  });

  test("aggregate establishes a guarded material saving floor", () => {
    const { aggregate } = runMcpEfficiencyScorecard();

    expect(aggregate.saved_calls).toBeGreaterThan(0);
    expect(aggregate.call_reduction_percent).toBeGreaterThanOrEqual(50);
    expect(aggregate.payload_reduction_percent).toBeGreaterThanOrEqual(25);
    expect(aggregate.optimized_verification_calls).toBe(
      aggregate.baseline_verification_calls
    );
    expect(aggregate.quality_preserved).toBe(true);
  });
});
