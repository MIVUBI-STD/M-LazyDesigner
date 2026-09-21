import type { NewTextureNativePlan } from "@/lib/texture/nativePlan";

export type CreateTextureSourcePayload = {
  name: string;
  type: "blank";
  width: number;
  height: number;
  data: string;
};

export function compileCreateTextureSourcePayload(
  name:string,
  plan:NewTextureNativePlan,
  encode:(pixels:Uint8ClampedArray,width:number,height:number)=>string
):CreateTextureSourcePayload{
  if(!name.trim()) throw new Error("Procedural texture creation requires a non-empty texture name.");
  const pixels=new Uint8ClampedArray(plan.rgba);
  const data=encode(pixels,plan.width,plan.height);
  if(!data.startsWith("data:image/")){
    throw new Error("Procedural texture encoder must return an image data URL accepted by create_texture.");
  }
  return {
    name,
    type:"blank",
    width:plan.width,
    height:plan.height,
    data,
  };
}
