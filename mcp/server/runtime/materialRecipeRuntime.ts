/// <reference types="blockbench-types" />

import type { TextureSourceRecipe } from "@/lib/texture/sourceComposer";
import { compileNewTextureNativePlan } from "@/lib/texture/nativePlan";
import { compileCreateTextureSourcePayload } from "@/lib/texture/createTextureAdapter";
import { rgbaToPngDataUrl } from "@/lib/textureBitmapRuntime";

export function compileBlockbenchProceduralTextureCreatePayload(
  name:string,
  recipe:TextureSourceRecipe
){
  const plan=compileNewTextureNativePlan(recipe);
  return compileCreateTextureSourcePayload(name,plan,rgbaToPngDataUrl);
}
