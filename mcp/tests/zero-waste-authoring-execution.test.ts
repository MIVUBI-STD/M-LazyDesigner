import { describe, expect, test } from "bun:test";
import { compileAuthoringRecipe } from "@/lib/authoringRecipe/compiler";
import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import { compileDesiredGeometryState } from "@/lib/authoringIntent/desiredState";
import { planAuthoringImpact } from "@/lib/orchestration/authoringImpact";
import { selectAuthoringExecutionStrategy } from "@/lib/orchestration/executionStrategy";
import { compileDeltaVerificationPlan } from "@/lib/orchestration/deltaVerification";
import { resolveSemanticIdentity } from "@/lib/authoringRecipe/semanticIdentity";
import { selectRecipeRebuildExecutionStrategy } from "@/lib/orchestration/executionStrategy";
import { planIncrementalRecipeRebuild } from "@/lib/authoringRecipe/incremental";

function recipe(width: number, count = 2): AuthoringRecipe {
  return {
    schema: 1,
    compiler_version: 1,
    id: "asset",
    name: "asset",
    prototypes: [{ id: "arm", name: "arm", size: [width, 8, 4], semantic_group: "upper_arm" }],
    patterns: [{
      kind: "LINEAR",
      id: "arms",
      prototype_id: "arm",
      count,
      axis: "X",
      spacing: 8,
      semantic_group: "upper_arm",
    }],
  };
}

describe("zero-waste authoring execution", () => {
  test("compiles multiple semantic operations locally without resending native coordinates", () => {
    const compiled = compileAuthoringRecipe(recipe(4));
    const desired = compileDesiredGeometryState(compiled, {
      action: "MODIFY",
      target: { semantic_group: "upper_arm" },
      geometry_operations: [
        { kind: "RESIZE_AXIS", axis: "X", mode: "MULTIPLY", value: 1.08 },
        { kind: "TRANSLATE", delta: [0, 1, 0] },
      ],
      preserve: ["RIG_PIVOTS", "UV_DENSITY", "ANIMATION_MOTION"],
    });

    expect(desired.affected_instance_ids).toEqual(["arms:0", "arms:1"]);
    expect(desired.upserts).toHaveLength(2);
    expect(desired.preserve_requests).toEqual([
      "ANIMATION_MOTION",
      "RIG_PIVOTS",
      "UV_DENSITY",
    ]);
    expect(desired.application_boundary).toBe("RECIPE_REWRITE_REQUIRED");
  });

  test("prefers recipe-owned incremental execution over explicit direct mutation", () => {
    const impact = planAuthoringImpact(recipe(4), recipe(5), {
      rig_instance_ids: ["arms:0", "arms:1"],
      animation_instance_ids: ["arms:0", "arms:1"],
    });

    const decision = selectAuthoringExecutionStrategy(impact, {
      total_scene_instances: 2,
      has_recipe_source: true,
      repeated_structure_ratio: 1,
    });

    expect(decision.strategy).toBe("RECIPE");
    expect(decision.reason).toBe("RECIPE_OWNED_INCREMENTAL");
  });

  test("escalates oversized structured texture work instead of emitting exact pixels", () => {
    const impact = planAuthoringImpact(recipe(4), recipe(5));
    const decision = selectAuthoringExecutionStrategy(impact, {
      total_scene_instances: 2,
      has_recipe_source: false,
      structured_texture_operation: true,
      exact_texture_coordinate_count: 4096,
    });
    expect(decision.strategy).toBe("PROCEDURAL");
  });

  test("verification budget never truncates required checks", () => {
    const impact = planAuthoringImpact(recipe(4, 2), recipe(4, 1));
    const verification = compileDeltaVerificationPlan(impact);

    expect(verification.risk).toBe("HIGH");
    expect(verification.required_task_count).toBe(verification.tasks.length);
    expect(verification.tasks.some((task) => task.domain === "UV")).toBe(true);
  });
  test("resolves semantic identity to stable native ownership without rediscovery", () => {
    const r = recipe(4);
    const compiled = compileAuthoringRecipe(r);
    const native = {
      schema: 1 as const,
      recipe_id: r.id,
      cubes: compiled.placements.map((placement, index) => ({
        uuid: "uuid-" + index,
        recipe_id: r.id,
        instance_id: placement.id,
        name: placement.name,
        from: placement.from,
        to: placement.to,
        origin: placement.origin,
        rotation: placement.rotation,
        inflate: placement.inflate,
      })),
    };
    const resolution = resolveSemanticIdentity(r, native, { semantic_group: "upper_arm" });
    expect(resolution.count).toBe(2);
    expect(resolution.identities.map((entry) => entry.native_uuid)).toEqual(["uuid-0", "uuid-1"]);
  });

  test("recipe rebuild cost selection reuses recipe ownership for any native delta", () => {
    const rebuild = planIncrementalRecipeRebuild(recipe(4), recipe(5));
    const decision = selectRecipeRebuildExecutionStrategy(rebuild);
    expect(decision.strategy).toBe("RECIPE");
    expect(decision.reason).toBe("RECIPE_OWNED_INCREMENTAL");
  });
});
