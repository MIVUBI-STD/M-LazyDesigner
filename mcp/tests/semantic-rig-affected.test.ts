import { describe, expect, test } from "bun:test";
import { affectedRigBoneIds } from "@/lib/rig/affected";
import type { CompiledAuthoringRecipe } from "@/lib/authoringRecipe/contracts";

describe("affected rig planning", () => {
  test("propagates mirrored rig ownership", () => {
    const compiled: CompiledAuthoringRecipe = {
      schema:1,compiler_version:1,recipe_id:"r",placements:[],
      symmetry_relationships:[{id:"s",source_instance_id:"left",target_instance_id:"right",plane:{axis:"X",position:0},uv_policy:"SHARE",texture_policy:"MIRROR",rig_policy:"MIRROR"}],
      metrics:{prototype_count:0,pattern_count:0,instance_count:0,realized_cube_count:0,unique_geometry_count:0,repeated_instance_count:0,symmetry_generated_count:1},
    };
    const ids=affectedRigBoneIds(compiled,{
      bones:[
        {id:"l",name:"l",origin:[-1,0,0],rotation:[0,0,0],parent:"root",source_instance_ids:["left"]},
        {id:"r",name:"r",origin:[1,0,0],rotation:[0,0,0],parent:"root",source_instance_ids:["right"]},
        {id:"body",name:"body",origin:[0,0,0],rotation:[0,0,0],parent:"root",source_instance_ids:["body"]},
      ],
      diagnostics:{fabrik_solves:0,source_instances:["body","left","right"]},
    },["left"]);
    expect(ids).toEqual(["l","r"]);
  });
});
