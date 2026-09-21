import { describe, expect, test } from "bun:test";
import { planAuthoringImpact } from "@/lib/orchestration/authoringImpact";
import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";

function recipe(group:string):AuthoringRecipe{
  return {
    schema:1,compiler_version:1,id:"asset",name:"asset",
    prototypes:[{id:"panel",name:"panel",size:[4,4,1],semantic_group:group}],
    patterns:[{kind:"LINEAR",id:"p",prototype_id:"panel",count:1,axis:"X",spacing:6,semantic_group:group}],
  };
}

describe("cross-domain semantic metadata impact",()=>{
  test("semantic material change avoids unnecessary geometry mutation",()=>{
    const impact=planAuthoringImpact(recipe("metal"),recipe("painted_metal"));
    expect(impact.geometry.upsert_instance_ids).toEqual([]);
    expect(impact.geometry.metadata_only_instance_ids).toHaveLength(1);
    expect(impact.texture.reason).toBe("SEMANTIC_MATERIAL_CHANGED");
    expect(impact.uv.stale).toBe(true);
  });
});
