import type { TextureRefinementIntent } from "@/lib/texture/computeCompiler";
import { compileTextureRefinementIntent } from "@/lib/texture/computeCompiler";
import type { TextureSourceRecipe } from "@/lib/texture/sourceComposer";
import { renderTextureSourceRecipe } from "@/lib/texture/sourceComposer";
import { diffTextureRegion } from "@/lib/texture/regionDiff";
import {
  applyGeometryAwareMaterialTreatment,
  type GeometryAwareMaterialIntent,
} from "@/lib/texture/geometryAwareTreatment";
import {
  deriveGeometrySurfaceSignals,
  type GeometrySignalEvidence,
} from "@/lib/texture/geometrySignalBuilder";

export type NewTextureNativePlan={
  kind:"CREATE_TEXTURE_SOURCE";
  width:number;
  height:number;
  rgba:Uint8Array;
};

export type GeometryAwareTextureBufferPlan={
  kind:"GEOMETRY_AWARE_TEXTURE_BUFFER";
  expected_revision:string;
  width:number;
  height:number;
  rgba:Uint8Array;
  changed_region:ReturnType<typeof diffTextureRegion>;
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

export function compileGeometryAwareTextureBufferPlan(input:{
  rgba:Uint8Array;
  evidence:GeometrySignalEvidence;
  intent:GeometryAwareMaterialIntent;
  expected_revision:string;
}):GeometryAwareTextureBufferPlan{
  if(!input.expected_revision.trim()) throw new Error("Geometry-aware texture planning requires expected revision.");
  const {width,height}=input.evidence;
  if(input.rgba.length!==width*height*4) throw new Error("Geometry-aware texture source dimensions do not match RGBA length.");
  const signals=deriveGeometrySurfaceSignals(input.evidence);
  const rgba=applyGeometryAwareMaterialTreatment(input.rgba,width,height,signals,input.intent);
  return {
    kind:"GEOMETRY_AWARE_TEXTURE_BUFFER",
    expected_revision:input.expected_revision,
    width,
    height,
    rgba,
    changed_region:diffTextureRegion(input.rgba,rgba,width,height),
  };
}

export function summarizeNewTextureChange(
  before:Uint8Array,
  plan:NewTextureNativePlan
){
  return diffTextureRegion(before,plan.rgba,plan.width,plan.height);
}
