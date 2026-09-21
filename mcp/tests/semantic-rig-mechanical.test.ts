import { describe, expect, test } from "bun:test";
import { compileMechanicalRigIntent } from "@/lib/rig/mechanicalTemplates";
import type { CompiledAuthoringRecipe } from "@/lib/authoringRecipe/contracts";

const compiled: CompiledAuthoringRecipe = {
  schema: 1, compiler_version: 1, recipe_id: "r",
  placements: [{ id:"door", name:"door", prototype_id:"p", from:[2,0,0], to:[6,8,1], origin:[4,4,0.5], rotation:[0,0,0], inflate:0, source_pattern_id:"p", instance_index:0 }],
  symmetry_relationships: [],
  metrics:{prototype_count:1,pattern_count:1,instance_count:1,realized_cube_count:1,unique_geometry_count:1,repeated_instance_count:0,symmetry_generated_count:0},
};

describe("mechanical rig templates", () => {
  test("derives hinge pivot from geometry edge", () => {
    const bone = compileMechanicalRigIntent(compiled, {
      kind:"HINGE", id:"door_hinge", name:"door_hinge", instance_id:"door", hinge_axis:"X", hinge_side:"MIN"
    });
    expect(bone.origin).toEqual([2,4,0.5]);
  });

  test("uses center for rotator/slider foundations", () => {
    expect(compileMechanicalRigIntent(compiled, {
      kind:"ROTATOR", id:"wheel", name:"wheel", instance_id:"door", axis:"Z"
    }).origin).toEqual([4,4,0.5]);
  });
});
