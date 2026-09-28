import { describe, expect, test } from "bun:test";
import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import { GatewayOrchestrationRecoveryState } from "./orchestrationRecoveryState";

function recipe(): AuthoringRecipe {
  return {
    schema: 1,
    compiler_version: 1,
    id: "recovery-asset",
    name: "recovery-asset",
    prototypes: [
      {
        id: "arm",
        name: "arm",
        size: [4, 8, 4],
        semantic_group: "upper_arm",
      },
    ],
    patterns: [
      {
        kind: "LINEAR",
        id: "arms",
        prototype_id: "arm",
        count: 2,
        axis: "X",
        spacing: 8,
        semantic_group: "upper_arm",
      },
    ],
  };
}

describe("Gateway orchestration recovery state", () => {
  test("runtime generation invalidation clears evidence and marks active corrections for recovery", () => {
    const state = new GatewayOrchestrationRecoveryState();
    const request = {
      domain: "GEOMETRY" as const,
      source: "capture_model_views" as const,
      verification_risk: "LOW" as const,
      views: ["front"] as const,
      views_role: "FALLBACK_IF_NO_GROUNDED_TARGETS" as const,
      size: 256 as const,
      size_role: "FALLBACK_IF_NO_GROUNDED_TARGETS" as const,
      scope_instance_ids: ["arms:0", "arms:1"],
    };
    const evidenceHandle = state.evidence.put({
      request,
      result: { revision: 1 },
    });
    const correctionHandle = state.corrections.start({
      recipe_id: "recovery-asset",
      base_recipe: recipe(),
      verification_request: request,
      verification_evidence_handle: evidenceHandle,
      discrepancies: [
        {
          code: "WIDTH_LOW",
          severity: "REVIEW",
          summary: "Width needs review.",
          views: ["front"],
          evidence_targets: ["width"],
        },
      ],
    });

    expect(state.snapshot()).toEqual({
      invalidation_count: 0,
      evidence_entries: 1,
      correction_loops: 1,
    });

    state.invalidateRuntimeGeneration();

    expect(state.snapshot()).toEqual({
      invalidation_count: 1,
      evidence_entries: 0,
      correction_loops: 1,
    });
    expect(state.corrections.projectContinuation(correctionHandle).verification)
      .toMatchObject({
        pending: true,
        recovery_required: true,
        recovery_reason: "RUNTIME_GENERATION_CHANGED",
      });
    expect(() => state.evidence.get(evidenceHandle)).toThrow(
      "VERIFICATION_EVIDENCE_NOT_FOUND"
    );
  });
});
