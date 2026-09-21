import { describe, expect, test } from "bun:test";
import { compileSemanticRig, placementAnchor } from "@/lib/rig/semanticRig";
import { compileSemanticRigToAddGroupBatch } from "@/lib/rig/toolCompiler";
import type { CompiledAuthoringRecipe } from "@/lib/authoringRecipe/contracts";

const compiled: CompiledAuthoringRecipe = {
  schema: 1,
  compiler_version: 1,
  recipe_id: "r",
  placements: [
    { id: "upper", name: "upper", prototype_id: "p", from: [0,4,0], to: [2,8,2], origin: [1,6,1], rotation: [0,0,0], inflate: 0, source_pattern_id: "p", instance_index: 0 },
    { id: "lower", name: "lower", prototype_id: "p", from: [0,0,0], to: [2,4,2], origin: [1,2,1], rotation: [0,0,0], inflate: 0, source_pattern_id: "p", instance_index: 1 },
  ],
  symmetry_relationships: [],
  metrics: { prototype_count: 1, pattern_count: 1, instance_count: 2, realized_cube_count: 2, unique_geometry_count: 1, repeated_instance_count: 1, symmetry_generated_count: 0 },
};

describe("semantic rig compiler", () => {
  test("derives pivots from geometry anchors", () => {
    expect(placementAnchor(compiled.placements[0], ["CENTER","MIN","CENTER"])).toEqual([1,4,1]);
    const plan = compileSemanticRig(compiled, [
      { kind: "JOINT", id: "shoulder", name: "shoulder", instance_id: "upper", anchor: ["CENTER","MAX","CENTER"] },
    ]);
    expect(plan.bones[0].origin).toEqual([1,8,1]);
  });

  test("compiles chain into one existing add_group batch", () => {
    const plan = compileSemanticRig(compiled, [
      { kind: "CHAIN", id: "arm", name_prefix: "arm", instance_ids: ["upper","lower"] },
    ]);
    const batch = compileSemanticRigToAddGroupBatch(plan);
    expect(batch.groups).toHaveLength(2);
    expect(batch.groups[1].parent).toBe("arm_1");
  });
});
