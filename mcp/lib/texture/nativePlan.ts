import type { TextureRefinementIntent } from "@/lib/texture/computeCompiler";
import { compileTextureRefinementIntent } from "@/lib/texture/computeCompiler";
import type { TextureSourceRecipe } from "@/lib/texture/sourceComposer";
import { renderTextureSourceRecipe } from "@/lib/texture/sourceComposer";
import { diffTextureRegion } from "@/lib/texture/regionDiff";
import type { PaintTransactionOperation } from "@/lib/paintTransaction";
import {
  applyGeometryAwareMaterialTreatment,
  type GeometryAwareMaterialIntent,
} from "@/lib/texture/geometryAwareTreatment";
import {
  deriveGeometrySurfaceSignals,
  type GeometrySignalEvidence,
} from "@/lib/texture/geometrySignalBuilder";
import {
  compileGeometrySignalEvidence,
  type GeometrySignalCompileInput,
} from "@/lib/texture/geometrySignalCompiler";

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

function byteHex(value:number){
  return Math.max(0,Math.min(255,Math.round(value))).toString(16).padStart(2,"0");
}
function rgbaHex(r:number,g:number,b:number,a:number){
  return "#"+byteHex(r)+byteHex(g)+byteHex(b)+byteHex(a);
}

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

export function compileGeometryAwareTextureToPaintTransaction(input:{
  rgba:Uint8Array;
  evidence:GeometrySignalEvidence;
  intent:GeometryAwareMaterialIntent;
  expected_revision:string;
  max_operations?:number;
  max_coordinates?:number;
}){
  const plan=compileGeometryAwareTextureBufferPlan(input);
  const maxOperations=input.max_operations ?? 64;
  const maxCoordinates=input.max_coordinates ?? 4096;
  if(!Number.isInteger(maxOperations)||maxOperations<1||maxOperations>64){
    throw new Error("Geometry-aware texture max_operations must be an integer within 1..64.");
  }
  if(!Number.isInteger(maxCoordinates)||maxCoordinates<1||maxCoordinates>65536){
    throw new Error("Geometry-aware texture max_coordinates must be an integer within 1..65536.");
  }
  const groups=new Map<string,Array<{x:number;y:number}>>();
  let changedCoordinates=0;
  for(let y=0;y<plan.height;y+=1){
    for(let x=0;x<plan.width;x+=1){
      const offset=(y*plan.width+x)*4;
      if(
        input.rgba[offset]===plan.rgba[offset] &&
        input.rgba[offset+1]===plan.rgba[offset+1] &&
        input.rgba[offset+2]===plan.rgba[offset+2] &&
        input.rgba[offset+3]===plan.rgba[offset+3]
      ) continue;
      changedCoordinates+=1;
      if(changedCoordinates>maxCoordinates){
        throw new Error(
          "GEOMETRY_AWARE_TEXTURE_COORDINATE_BUDGET_EXCEEDED: changed pixel count exceeds bounded coordinate budget "+maxCoordinates+"."
        );
      }
      const color=rgbaHex(plan.rgba[offset],plan.rgba[offset+1],plan.rgba[offset+2],plan.rgba[offset+3]);
      const coordinates=groups.get(color) ?? [];
      coordinates.push({x,y});
      groups.set(color,coordinates);
    }
  }
  if(groups.size===0) throw new Error("Geometry-aware texture treatment produced no pixel changes.");
  if(groups.size>maxOperations){
    throw new Error(
      "GEOMETRY_AWARE_TEXTURE_OPERATION_BUDGET_EXCEEDED: exact color groups "+groups.size+
      " exceed bounded paint operation budget "+maxOperations+"."
    );
  }
  const operations:PaintTransactionOperation[]=[...groups.entries()]
    .sort(([a],[b])=>a.localeCompare(b))
    .map(([color,coordinates])=>({operation:"set_pixels" as const,color,coordinates}));
  return {
    kind:"PAINT_TEXTURE_TRANSACTION" as const,
    expected_revision:plan.expected_revision,
    operations,
    changed_region:plan.changed_region,
  };
}

export function compileGeometryAwareTextureFromCompiledEvidence(input:{
  rgba:Uint8Array;
  geometry:GeometrySignalCompileInput;
  intent:GeometryAwareMaterialIntent;
  expected_revision:string;
  max_operations?:number;
  max_coordinates?:number;
}){
  const evidence=compileGeometrySignalEvidence(input.geometry);
  return compileGeometryAwareTextureToPaintTransaction({
    rgba:input.rgba,
    evidence,
    intent:input.intent,
    expected_revision:input.expected_revision,
    ...(input.max_operations!==undefined?{max_operations:input.max_operations}:{}),
    ...(input.max_coordinates!==undefined?{max_coordinates:input.max_coordinates}:{}),
  });
}

export function summarizeNewTextureChange(
  before:Uint8Array,
  plan:NewTextureNativePlan
){
  return diffTextureRegion(before,plan.rgba,plan.width,plan.height);
}
