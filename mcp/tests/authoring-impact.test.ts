import { describe, expect, test } from "bun:test";
import { planAuthoringImpact } from "@/lib/orchestration/authoringImpact";
import { compileMinimalVerificationPlan } from "@/lib/orchestration/verificationPlan";
import { compileAuthoringExecutionOrder } from "@/lib/orchestration/executionOrder";
import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";

function recipe(width:number):AuthoringRecipe{
  return {
    schema:1,compiler_version:1,id:"asset",name:"asset",
    prototypes:[{id:"panel",name:"panel",size:[width,4,1],semantic_group:"metal"}],
    patterns:[{kind:"LINEAR",id:"p",prototype_id:"panel",count:2,axis:"X",spacing:6,semantic_group:"metal"}],
  };
}

describe("cross-domain authoring impact",()=>{
  test("geometry change produces bounded downstream scopes",()=>{
    const impact=planAuthoringImpact(recipe(4),recipe(5));
    expect(impact.geometry.upsert_instance_ids).toHaveLength(2);
    expect(impact.uv.scope).toBe("AFFECTED_ONLY");
    expect(impact.rig.scope).toBe("AFFECTED_ONLY");
    expect(impact.animation.scope).toBe("AFFECTED_ONLY");
    expect(impact.texture.reason).toBe("UV_CHANGED");
    expect(compileAuthoringExecutionOrder(impact)).toEqual([
      "GEOMETRY","UV","RIG","TEXTURE","ANIMATION","VERIFY"
    ]);
    expect(compileMinimalVerificationPlan(impact).map(task=>task.domain)).toEqual([
      "GEOMETRY","UV","RIG","ANIMATION","TEXTURE"
    ]);
  });
});
