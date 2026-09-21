import { compileMaterialRecipe } from "@/lib/texture/materialRecipe";

function numericCount(value:unknown):number{
  if(typeof value==="number") return 1;
  if(Array.isArray(value)) return value.reduce((sum,item)=>sum+numericCount(item),0);
  if(value&&typeof value==="object") return Object.values(value).reduce((sum,item)=>sum+numericCount(item),0);
  return 0;
}

const intent={
  kind:"PAINTED_METAL" as const,
  width:64,height:64,
  base:[40,90,160,255] as [number,number,number,number],
  variation:8,seed:5,dither:true,
  directional_shading:{axis:"y" as const,to:[24,60,120,255] as [number,number,number,number],strength:0.6},
};
const compiled=compileMaterialRecipe(intent);
const explicitPixelNumericValues=intent.width*intent.height*4;
const semanticNumericValues=numericCount(intent);
const result={
  explicit_pixel_numeric_value_proxy:explicitPixelNumericValues,
  semantic_numeric_values:semanticNumericValues,
  authored_numeric_value_proxy_reduction:1-semanticNumericValues/explicitPixelNumericValues,
  compiled_recipe:compiled,
};
console.log(JSON.stringify(result,null,2));
if(result.authored_numeric_value_proxy_reduction<0.95) throw new Error("Material recipe explicit-pixel authoring proxy reduction regressed below 95%.");
