import type { Rgba } from "@/lib/texture/proceduralOps";
import type { ScalarMask } from "@/lib/texture/masks";

function clampByte(value:number){return Math.max(0,Math.min(255,Math.round(value)));}

export function applyMaskedColor(
  rgba:Uint8Array,
  width:number,
  height:number,
  mask:ScalarMask,
  color:Rgba,
  strength:number
):Uint8Array{
  if(rgba.length!==width*height*4) throw new Error("RGBA buffer length does not match masked operation dimensions.");
  if(mask.width!==width||mask.height!==height||mask.values.length!==width*height) throw new Error("Mask dimensions do not match texture.");
  if(!Number.isFinite(strength)||strength<0||strength>1) throw new Error("Masked color strength must be within 0..1.");
  const out=new Uint8Array(rgba);
  for(let i=0;i<width*height;i+=1){
    const t=Math.max(0,Math.min(1,mask.values[i]*strength));
    const p=i*4;
    for(let c=0;c<4;c+=1) out[p+c]=clampByte(out[p+c]+(color[c]-out[p+c])*t);
  }
  return out;
}

export function applyDirectionalWear(
  rgba:Uint8Array,
  width:number,
  height:number,
  mask:ScalarMask,
  wear:Rgba,
  axis:"x"|"y",
  strength:number
):Uint8Array{
  if(rgba.length!==width*height*4) throw new Error("RGBA buffer length does not match wear dimensions.");
  const directional=new Float32Array(width*height);
  for(let y=0;y<height;y+=1) for(let x=0;x<width;x+=1){
    const t=axis==="x"?x/Math.max(1,width-1):y/Math.max(1,height-1);
    directional[y*width+x]=mask.values[y*width+x]*(0.5+0.5*t);
  }
  return applyMaskedColor(rgba,width,height,{width,height,values:directional},wear,strength);
}
