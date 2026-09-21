import { describe, expect, test } from "bun:test";
import { compileAuthoringRecipe } from "@/lib/authoringRecipe/compiler";
import { compileSemanticGeometryEdit } from "@/lib/authoringRecipe/semanticEdit";
import { selectLowestCostCorrection } from "@/lib/correctionSolver";
import { inferFunctionalRigHints, compileHighConfidenceFunctionalRig } from "@/lib/rig/functionalInference";
import { compileSecondaryMotion } from "@/lib/animation/secondaryMotion";
import { deriveReferenceCorrectionVectors } from "@/lib/referenceCorrection";
import { applyGeometryAwareMaterialTreatment } from "@/lib/texture/geometryAwareTreatment";

function fixture(){
  return compileAuthoringRecipe({
    schema:1,compiler_version:1,id:"fixture",name:"Fixture",
    prototypes:[
      {id:"door",name:"door_left",size:[2,4,0.5],semantic_group:"door"},
      {id:"frame",name:"frame",size:[4,5,0.5],semantic_group:"frame"},
    ],
    patterns:[
      {kind:"LINEAR",id:"door_pattern",prototype_id:"door",count:1,axis:"X",spacing:0,start:[0,0,0],semantic_group:"door"},
      {kind:"LINEAR",id:"frame_pattern",prototype_id:"frame",count:1,axis:"X",spacing:0,start:[5,0,0],semantic_group:"frame"},
    ],
  });
}

describe("operator mentality reduction foundations",()=>{
  test("semantic geometry edit is affected-only and preserves unrelated geometry",()=>{
    const compiled=fixture();
    const plan=compileSemanticGeometryEdit(compiled,{
      target:{semantic_group:"door"},
      operation:{kind:"RESIZE_AXIS",axis:"X",mode:"MULTIPLY",value:0.8,anchor:"CENTER"},
    });
    expect(plan.affected_instance_ids).toHaveLength(1);
    expect(plan.preserved_instance_ids).toHaveLength(1);
    expect(plan.upserts[0].to[0]-plan.upserts[0].from[0]).toBeCloseTo(1.6);
  });

  test("correction solver prefers low residual error without ignoring mutation and risk",()=>{
    const decision=selectLowestCostCorrection([
      {id:"rebuild",patch:{kind:"rebuild"},predicted_error:0.01,mutation_cost:1,risk:0.8},
      {id:"bounded",patch:{kind:"resize"},predicted_error:0.08,mutation_cost:0.1,risk:0.1},
    ]);
    expect(decision.selected.id).toBe("bounded");
  });

  test("functional rig inference only compiles sufficiently supported movable parts",()=>{
    const hints=inferFunctionalRigHints(fixture());
    const intents=compileHighConfidenceFunctionalRig(hints);
    expect(intents.some((intent)=>intent.instance_id==="door_pattern:0")).toBe(true);
  });

  test("secondary motion adds child follow-through without manual keyframe authoring",()=>{
    const result=compileSecondaryMotion({
      name:"door_motion",duration:1,poses:[
        {id:"a",time:0,bones:{door:{rotation:[0,0,0]}}},
        {id:"b",time:0.5,bones:{door:{rotation:[0,45,0]}}},
      ],
    },[{parent_bone:"door",child_bone:"handle",lag_seconds:0.05}]);
    expect(result.poses.some((pose)=>pose.bones.handle!==undefined)).toBe(true);
  });

  test("reference deviations become explicit correction vectors",()=>{
    const corrections=deriveReferenceCorrectionVectors([
      {kind:"BOUNDS",instance_id:"door_pattern:0",axis:"X",expected:1.8,actual:2},
      {kind:"CENTER_OFFSET",instance_id:"door_pattern:0",expected_center:[0,0,0],actual_center:[1,0,0]},
    ]);
    expect(corrections).toHaveLength(2);
    expect(corrections[0].operation).toBe("RESIZE_AXIS");
  });

  test("geometry-aware treatment uses provided spatial evidence",()=>{
    const rgba=new Uint8Array([100,100,100,255,100,100,100,255]);
    const values=new Float32Array([1,0]);
    const out=applyGeometryAwareMaterialTreatment(rgba,2,1,{
      edge:{width:2,height:1,values},
    },{
      wear:{color:[200,200,200,255],strength:0.5},
    });
    expect(out[0]).toBeGreaterThan(100);
    expect(out[4]).toBe(100);
  });
});
