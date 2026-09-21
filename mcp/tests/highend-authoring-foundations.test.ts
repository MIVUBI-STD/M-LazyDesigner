import { describe, expect, test } from "bun:test";
import { compileAuthoringRecipe } from "@/lib/authoringRecipe/compiler";
import { selectCompiledPlacements } from "@/lib/authoringRecipe/selection";
import { evaluateSemanticGeometryStack, composeReusableAuthoringAssets } from "@/lib/authoringRecipe/service";
import { compileMotionWithSpringToCreateAnimationPlan } from "@/lib/animation/toolCompiler";
import { compileGeometryAwareTextureFromCompiledEvidence } from "@/lib/texture/nativePlan";
import { tools } from "@/lib/factories";
import "@/server/tools";

function recipeFixture(){
  return {
    schema:1 as const,compiler_version:1 as const,id:"fixture",name:"Fixture",
    prototypes:[
      {id:"panel",name:"panel",size:[2,4,0.5] as [number,number,number],semantic_group:"panel"},
      {id:"trim",name:"trim",size:[0.25,4,0.25] as [number,number,number],semantic_group:"trim"},
    ],
    patterns:[
      {kind:"LINEAR" as const,id:"panel_pattern",prototype_id:"panel",count:2,axis:"X" as const,spacing:3,start:[0,0,0] as [number,number,number],semantic_group:"panel"},
      {kind:"LINEAR" as const,id:"trim_pattern",prototype_id:"trim",count:2,axis:"X" as const,spacing:3,start:[0,0,0] as [number,number,number],semantic_group:"trim"},
    ],
  };
}

describe("high-end bounded authoring foundations",()=>{
  test("semantic selection filters by typed spatial predicates",()=>{
    const compiled=compileAuthoringRecipe(recipeFixture());
    const selected=selectCompiledPlacements(compiled,{
      all:[
        {kind:"SEMANTIC_GROUP",equals:"panel"},
        {kind:"AXIS_CENTER",axis:"X",op:"GT",value:2},
      ],
    });
    expect(selected).toHaveLength(1);
  });

  test("operation stack applies sequential source-safe edits",()=>{
    const result=evaluateSemanticGeometryStack(recipeFixture(),{
      id:"panel_ops",
      operations:[
        {
          id:"thin_panels",
          selection:{all:[{kind:"PROTOTYPE",equals:"panel"}]},
          operation:{kind:"RESIZE_AXIS",axis:"Z",mode:"MULTIPLY",value:0.8,anchor:"MIN"},
        },
        {
          id:"move_trim",
          selection:{all:[{kind:"SEMANTIC_GROUP",equals:"trim"}]},
          operation:{kind:"TRANSLATE",delta:[0,0,0.25]},
        },
      ],
    });
    expect(result.receipts).toHaveLength(2);
    expect(result.rebuild.upserts.length).toBeGreaterThan(0);
  });

  test("reusable authoring assets wrap existing component composition",()=>{
    const assetRecipe={
      schema:1 as const,compiler_version:1 as const,id:"door_component",name:"Door",
      prototypes:[{id:"door_panel",name:"door_panel",size:[2,4,0.5] as [number,number,number]}],
      patterns:[{kind:"LINEAR" as const,id:"door",prototype_id:"door_panel",count:1,axis:"X" as const,spacing:0,start:[0,0,0] as [number,number,number]}],
    };
    const composed=composeReusableAuthoringAssets(
      {schema:1,compiler_version:1,id:"root",name:"Root"},
      [{id:"sliding_door",name:"Sliding Door",version:1,component:{id:"ignored",name:"ignored",recipe:assetRecipe}}],
      [{id:"left",asset_id:"sliding_door",translation:[0,0,0]}]
    );
    expect(composed.prototypes[0].id).toContain("left/");
  });

  test("bounded spring motion bakes through existing animation compiler",()=>{
    const plan=compileMotionWithSpringToCreateAnimationPlan({
      name:"door",duration:1,poses:[
        {id:"a",time:0,bones:{door:{rotation:[0,0,0]}}},
        {id:"b",time:1,bones:{door:{rotation:[0,60,0]}}},
      ],
    },[{parent_bone:"door",child_bone:"handle",channel:"rotation",sample_rate:8}]);
    expect(plan.create_animation.bones.handle.length).toBeGreaterThan(2);
  });

  test("geometry signal compiler reaches existing paint transaction contract",()=>{
    const compiled=compileAuthoringRecipe(recipeFixture());
    const rgba=new Uint8Array(4*4*4).fill(100);
    for(let i=3;i<rgba.length;i+=4) rgba[i]=255;
    const plan=compileGeometryAwareTextureFromCompiledEvidence({
      rgba,
      geometry:{
        compiled,width:4,height:4,edge_falloff:1,
        faces:[{instance_id:"panel_pattern:0",atlas_rect:{x:0,y:0,width:2,height:4},world_normal:[0,1,0],contact:true}],
      },
      intent:{wear:{color:[160,160,160,255],strength:0.5},contact_dirt:{color:[60,60,60,255],strength:0.25}},
      expected_revision:"rev-1",
    });
    expect(plan.kind).toBe("PAINT_TEXTURE_TRANSACTION");
    expect(plan.operations.length).toBeGreaterThan(0);
  });

  test("new foundations do not register public MCP capabilities",()=>{
    expect(tools).not.toHaveProperty("semantic_operation_stack");
    expect(tools).not.toHaveProperty("geometry_fields");
    expect(tools).not.toHaveProperty("spring_motion");
    expect(tools).not.toHaveProperty("authoring_assets");
  });
});
