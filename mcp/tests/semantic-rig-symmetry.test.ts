import { describe, expect, test } from "bun:test";
import { mirrorRigBoneFromRecipe } from "@/lib/rig/symmetry";
import type { CompiledAuthoringRecipe } from "@/lib/authoringRecipe/contracts";

describe("semantic rig symmetry", () => {
  test("mirrors pivot through recipe relationship", () => {
    const compiled: CompiledAuthoringRecipe = {
      schema: 1, compiler_version: 1, recipe_id: "r",
      placements: [],
      symmetry_relationships: [{
        id: "arms", source_instance_id: "left", target_instance_id: "right",
        plane: { axis: "X", position: 0 },
        uv_policy: "SHARE", texture_policy: "MIRROR", rig_policy: "MIRROR",
      }],
      metrics: { prototype_count:0,pattern_count:0,instance_count:0,realized_cube_count:0,unique_geometry_count:0,repeated_instance_count:0,symmetry_generated_count:1 },
    };
    const mirrored = mirrorRigBoneFromRecipe(compiled, {
      bones: [{ id: "left_shoulder", name: "shoulder_L", origin: [-4,8,0], rotation:[0,0,0], parent:"root", source_instance_ids:["left"] }],
      diagnostics: { fabrik_solves: 0, source_instances: ["left"] },
    }, {
      source_bone_id: "left_shoulder",
      relation_id: "arms",
      target_bone_id: "right_shoulder",
      target_name: "shoulder_R",
    });
    expect(mirrored.origin).toEqual([4,8,0]);
    expect(mirrored.source_instance_ids).toEqual(["right"]);
  });
});
