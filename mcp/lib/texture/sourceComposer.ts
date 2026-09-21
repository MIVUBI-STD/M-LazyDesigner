import type { MaterialRecipe } from "@/lib/texture/materialRecipe";
import { renderMaterialRecipe } from "@/lib/texture/materialRecipe";
import type { SurfacePattern } from "@/lib/texture/surfacePatterns";
import { renderSurfacePattern } from "@/lib/texture/surfacePatterns";

export type TextureSourceRecipe={
  material:MaterialRecipe;
  pattern?:SurfacePattern;
  pattern_opacity?:number;
};

function mixByte(a:number,b:number,t:number){return Math.max(0,Math.min(255,Math.round(a+(b-a)*t)));}

export function renderTextureSourceRecipe(recipe:TextureSourceRecipe):Uint8Array{
  let out=renderMaterialRecipe(recipe.material);
  if(!recipe.pattern) return out;
  const opacity=recipe.pattern_opacity ?? 1;
  if(!Number.isFinite(opacity)||opacity<0||opacity>1) throw new Error("Pattern opacity must be within 0..1.");
  const pattern=renderSurfacePattern(recipe.material.width,recipe.material.height,recipe.pattern);
  const mixed=new Uint8Array(out.length);
  for(let i=0;i<out.length;i+=4){
    for(let c=0;c<4;c+=1) mixed[i+c]=mixByte(out[i+c],pattern[i+c],opacity);
  }
  return mixed;
}
