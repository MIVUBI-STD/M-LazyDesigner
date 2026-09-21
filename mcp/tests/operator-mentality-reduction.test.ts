import { describe, expect, test } from "bun:test";
import { compileAuthoringRecipe } from "@/lib/authoringRecipe/compiler";
import {
  chooseBoundedGeometryCorrection,
  planReferenceGeometryCorrections,
  planSemanticGeometryEdit,
} from "@/lib/authoringRecipe/service";
import { compileFunctionalRigToAddGroupBatch } from "@/lib/rig/toolCompiler";
import { compileMotionWithSecondaryToCreateAnimationPlan } from "@/lib/animation/toolCompiler";
import { compileGeometryAwareTextureBufferPlan } from "@/lib/texture/nativePlan";

function recipeFixture(){
  return {
    schema:1 as const,compiler_version:1 as const,id:"fixture",name:"Fixture",
    prototypes:[
      {id:"door",name:"door_hinge_y",size:[2,4,0.5] as [number,number,number],semantic_group:"door"},
      {id:"frame",name:"frame",size:[4,5,0.5] as [number,number,number],semantic_group:"frame"},
    ],
    patterns:[
      {kind:"LINEAR" as const,id:"door_pattern",prototype_id:"door",count:1,axis:"X" as const,spacing:0,start:[0,0,0] as [number,number,number],semantic_group:"door"},
      {kind:"LINEAR" as const,id:"frame_pattern",prototype_id:"frame",count:1,axis:"X" as const,spacing:0,start:[5,0,0] as [number,number,number],semantic_group:"frame"},
    ],
  };
}

describe("operator mentality reduction foundations",()=>{
  test("semantic geometry edit is owned through authoring recipe service",()=>{
    const plan=planSemanticGeometryEdit(recipeFixture(),{
      target:{semantic_group:"door"},
      operation:{kind:"RESIZE_AXIS",axis:"X",mode:"MULTIPLY",value:0.8,anchor:"CENTER"},
    });
    expect(plan.affected_instance_ids).toHaveLength(1);
    expect(plan.preserved_instance_ids).toHaveLength(1);
    expect(plan.upserts[0].to[0]-plan.upserts[0].from[0]).toBeCloseTo(1.6);
  });

  test("correction solver remains planning-only under geometry owner",()=>{
    const decision=chooseBoundedGeometryCorrection([
      {id:"rebuild",patch:{kind:"rebuild"},predicted_error:0.01,mutation_cost:1,risk:0.8},
      {id:"bounded",patch:{kind:"resize"},predicted_error:0.08,mutation_cost:0.1,risk:0.1},
    ]);
    expect(decision.selected.id).toBe("bounded");
  });

  test("functional rig inference compiles through existing add_group contract",()=>{
    const compiled=compileAuthoringRecipe(recipeFixture());
    const plan=compileFunctionalRigToAddGroupBatch(compiled);
    expect(plan.compiled_intent_count).toBe(1);
    expect(plan.groups[0].name).toContain("door_pattern");
  });

  test("secondary motion compiles through existing animation plan",()=>{
    const plan=compileMotionWithSecondaryToCreateAnimationPlan({
      name:"door_motion",duration:1,poses:[
        {id:"a",time:0,bones:{door:{rotation:[0,0,0]}}},
        {id:"b",time:0.5,bones:{door:{rotation:[0,45,0]}}},
      ],
    },[{parent_bone:"door",child_bone:"handle",lag_seconds:0.05}]);
    expect(plan.create_animation.bones.handle.length).toBeGreaterThan(0);
    expect(plan.post_create_keyframe_edits.length).toBeGreaterThan(0);
  });

  test("reference deviations compile through geometry owner",()=>{
    const planned=planReferenceGeometryCorrections(recipeFixture(),[
      {kind:"BOUNDS",instance_id:"door_pattern:0",axis:"X",expected:1.8,actual:2},
      {kind:"CENTER_OFFSET",instance_id:"door_pattern:0",expected_center:[0,0,0],actual_center:[1,0,0]},
      {kind:"ROTATION",instance_id:"door_pattern:0",axis:"Y",expected_degrees:90,actual_degrees:80},
    ]);
    expect(planned.plans).toHaveLength(3);
    expect(planned.plans.every((plan)=>plan.affected_instance_ids.length===1)).toBe(true);
  });

  test("geometry-aware material compiles through texture native planning owner",()=>{
    const rgba=new Uint8Array([100,100,100,255,100,100,100,255]);
    const plan=compileGeometryAwareTextureBufferPlan({
      rgba,
      evidence:{width:2,height:1,edge_falloff:1},
      intent:{wear:{color:[200,200,200,255],strength:0.5}},
      expected_revision:"rev-1",
    });
    expect(plan.rgba[0]).toBeGreaterThan(100);
    expect(plan.expected_revision).toBe("rev-1");
  });
});
