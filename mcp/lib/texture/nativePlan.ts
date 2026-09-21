import type { TextureRefinementIntent } from "@/lib/texture/computeCompiler";
import { compileTextureRefinementIntent } from "@/lib/texture/computeCompiler";
import type { TextureSourceRecipe } from "@/lib/texture/sourceComposer";
import { renderTextureSourceRecipe } from "@/lib/texture/sourceComposer";
import { diffTextureRegion } from "@/lib/texture/regionDiff";

export type NewTextureNativePlan={
  kind:"CREATE_TEXTURE_SOURCE";
  width:number;
  height:number;
  rgba:Uint8Array;
};

export function compileNewTextureNativePlan(recipe:TextureSourceRecipe):NewTextureNativePlan{
  const rgba=renderTextureSourceRecipe(recipe);
  return {kind:"CREATE_TEXTURE_SOURCE",width:recipe.material.width,height:recipe.material.height,rgba};
}

export function compileTextureRefinementNativePlan(
  intent:TextureRefinementIntent,
  expected_revision:string
){
  if(!expected_revision.trim()) throw new Error("Texture refinement requires expected revision.");
  const compiled=compileTextureRefinementIntent(intent);
  return {
    kind:"PAINT_TEXTURE_COMPUTE" as const,
    expected_revision,
    compute:compiled.compute,
  };
}

export function summarizeNewTextureChange(
  before:Uint8Array,
  plan:NewTextureNativePlan
){
  return diffTextureRegion(before,plan.rgba,plan.width,plan.height);
}
