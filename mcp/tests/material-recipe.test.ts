import { describe, expect, test } from "bun:test";
import { compileMaterialRecipe, renderMaterialRecipe } from "@/lib/texture/materialRecipe";

describe("material recipe",()=>{
  test("compiles deterministic procedural texture intent",()=>{
    const recipe={kind:"PAINTED_METAL" as const,width:8,height:8,base:[40,80,120,255] as const,seed:3,dither:true};
    expect(compileMaterialRecipe(recipe).noise?.amount).toBe(8);
    expect([...renderMaterialRecipe(recipe)]).toEqual([...renderMaterialRecipe(recipe)]);
  });
});
