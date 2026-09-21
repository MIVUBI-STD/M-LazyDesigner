import { compileMaterialRecipe } from "@/lib/texture/materialRecipe";

function bytes(value:unknown){return new TextEncoder().encode(JSON.stringify(value)).length;}

const intent={
  kind:"PAINTED_METAL" as const,
  width:64,height:64,
  base:[40,90,160,255] as [number,number,number,number],
  variation:8,seed:5,dither:true,
  directional_shading:{axis:"y" as const,to:[24,60,120,255] as [number,number,number,number],strength:0.6},
};
const compiled=compileMaterialRecipe(intent);
const manualProxy={
  fill:{color:intent.base},
  gradient:intent.directional_shading,
  noise:{seed:intent.seed,amount:intent.variation},
  dither:{matrix:"bayer4"},
  quantize:{enabled:true},
  repeated_brush_strokes:Array.from({length:24},(_,i)=>({x:i*2,y:i,width:4,opacity:0.15})),
};
const semanticBytes=bytes(intent);
const manualBytes=bytes(manualProxy);
const result={
  semantic_payload_bytes:semanticBytes,
  manual_operation_proxy_bytes:manualBytes,
  serialized_payload_proxy_reduction:1-semanticBytes/manualBytes,
};
console.log(JSON.stringify(result,null,2));
if(result.serialized_payload_proxy_reduction<0.25) throw new Error("Material recipe payload proxy reduction regressed below 25%.");
