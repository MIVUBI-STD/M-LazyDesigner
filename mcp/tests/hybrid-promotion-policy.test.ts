import { describe, expect, test } from "bun:test";
import {
  assertHybridPromotionPolicy,
  evaluateHybridPromotionPolicy,
} from "../scripts/evaluate-hybrid-promotion-policy";
import { HYBRID_4_EXPERIMENTAL_DIRECT_CAPABILITIES } from "../gateway/experimental/hybridProfile";

describe("Hybrid direct capability promotion policy", () => {
  test("current Hybrid-4 is selected from replay evidence, not a separate list", () => {
    const report = evaluateHybridPromotionPolicy();
    assertHybridPromotionPolicy();

    expect(
      [...report.recommendation.direct_capabilities].sort()
    ).toEqual(
      [...HYBRID_4_EXPERIMENTAL_DIRECT_CAPABILITIES].sort()
    );
  });

  test("every promoted capability clears safety and efficiency gates", () => {
    const report = evaluateHybridPromotionPolicy();
    const promoted = new Set(
      report.recommendation.direct_capabilities
    );

    for (const candidate of report.candidates) {
      if (!promoted.has(candidate.capability)) continue;
      expect(candidate.eligible).toBe(true);
      expect(candidate.saved_client_calls).toBeGreaterThanOrEqual(
        report.policy.min_saved_client_calls
      );
      expect(candidate.static_bytes).toBeLessThanOrEqual(
        report.policy.max_static_bytes_per_tool
      );
      expect(candidate.blocked_preserved).toBe(true);
      expect(candidate.capability_preserved).toBe(true);
    }
  });

  test("promotion respects aggregate static schema budget", () => {
    const report = evaluateHybridPromotionPolicy();
    expect(report.recommendation.total_static_bytes).toBeLessThanOrEqual(
      report.policy.max_total_static_bytes
    );
    expect(report.recommendation.direct_tool_count).toBeLessThanOrEqual(
      report.policy.max_direct_tools
    );
  });
});
