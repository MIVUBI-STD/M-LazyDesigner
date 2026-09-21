import type { PaletteRgb } from "@/lib/texture/proceduralOps";
import type { TextureComputeOperationName } from "@/lib/textureComputeRequest";

function hexByte(v:number){return Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0");}
function paletteHex(palette:readonly PaletteRgb[]):string[]{
  return palette.map(([r,g,b])=>"#"+hexByte(r)+hexByte(g)+hexByte(b));
}

export type TextureRefinementIntent={
  target_rect?:{x:number;y:number;width:number;height:number};
  auto_levels?:{strength?:number;low_clip_percent?:number;high_clip_percent?:number};
  directional_shade?:{
    source?:"lightness"|"alpha";
    invert?:boolean;
    azimuth_degrees?:number;
    elevation_degrees?:number;
    depth?:number;
    ambient?:number;
    strength?:number;
  };
  posterize_levels?:number;
  palette?:readonly PaletteRgb[];
  ordered_dither?:boolean;
};

export type TextureComputeRequestStep={
  operation:TextureComputeOperationName;
  args?:Record<string,unknown>;
};

function attachTargetRect(
  steps:TextureComputeRequestStep[],
  targetRect:TextureRefinementIntent["target_rect"]
):TextureComputeRequestStep[]{
  if(!targetRect) return steps;
  const first=steps[0];
  return [
    {
      ...first,
      args:{
        ...(first.args ?? {}),
        target_rect:targetRect,
      },
    },
    ...steps.slice(1),
  ];
}

export function compileTextureRefinementIntent(intent:TextureRefinementIntent){
  if(intent.target_rect && intent.ordered_dither && intent.palette){
    throw new Error(
      "Ordered palette dithering is not ROI-safe in the existing texture compute runtime because Bayer phase is atlas-relative. Remove target_rect or use nearest palettize."
    );
  }
  const steps:TextureComputeRequestStep[]=[];
  if(intent.auto_levels) steps.push({operation:"auto_levels",args:{...intent.auto_levels}});
  if(intent.directional_shade) steps.push({operation:"directional_shade",args:{...intent.directional_shade}});
  if(intent.posterize_levels!==undefined){
    if(!Number.isInteger(intent.posterize_levels)||intent.posterize_levels<2||intent.posterize_levels>32) throw new Error("Posterize levels must be within 2..32.");
    steps.push({operation:"posterize",args:{levels:intent.posterize_levels}});
  }
  if(intent.palette){
    if(intent.palette.length===0||intent.palette.length>64) throw new Error("Texture refinement palette must contain 1..64 colors.");
    steps.push({
      operation:"palettize",
      args:{
        palette:paletteHex(intent.palette),
        dither:intent.ordered_dither?"ordered":"none",
        ...(intent.ordered_dither?{matrix:"bayer4"}:{}),
      },
    });
  }
  if(steps.length===0) throw new Error("Texture refinement intent contains no authored compute step.");
  return {
    compute:attachTargetRect(steps,intent.target_rect),
  };
}
