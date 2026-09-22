import { describe, expect, test } from "bun:test";
import { buildAffectedExecutionPlan } from "../scripts/plan-affected-execution";
import { CAPABILITY_SEMANTIC_REGISTRY } from "../gateway/capabilities/semanticRegistry";

describe("affected execution semantic snapshot integration", () => {
  test("unchanged semantic snapshot produces no semantic invalidation work", () => {
    const plan = buildAffectedExecutionPlan(
      ["mcp/gateway/statusProjection.ts"],
      CAPABILITY_SEMANTIC_REGISTRY
    );

    expect(plan.semantic_diff).toEqual([]);
    expect(plan.semantic_invalidation?.changed_ids).toEqual([]);
  });

  test("routing-only snapshot drift is folded into affected checks", () => {
    const previous = CAPABILITY_SEMANTIC_REGISTRY.map((entry, index) =>
      index === 0
        ? {
            ...entry,
            fingerprints: {
              ...entry.fingerprints,
              routing: "0".repeat(64),
              aggregate: "1".repeat(64),
            },
            semanticFingerprint: "1".repeat(64),
          }
        : entry
    );

    const plan = buildAffectedExecutionPlan(
      ["mcp/gateway/capabilities/semanticRegistry.ts"],
      previous
    );

    expect(plan.semantic_diff?.[0]?.dimensions).toContain("ROUTING");
    expect(plan.execution.checks).toContain("CAPABILITY_INTELLIGENCE");
    expect(plan.execution.checks).toContain("DECISION_EFFICIENCY");
  });
});
