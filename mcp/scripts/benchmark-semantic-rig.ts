import { compileSemanticRig } from "@/lib/rig/semanticRig";
import type { CompiledAuthoringRecipe } from "@/lib/authoringRecipe/contracts";

function bytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

const placements = Array.from({length:12},(_,index)=>({
  id:"part_"+index,name:"part_"+index,prototype_id:"p",
  from:[0,index*2,0] as [number,number,number],
  to:[2,index*2+2,2] as [number,number,number],
  origin:[1,index*2+1,1] as [number,number,number],
  rotation:[0,0,0] as [number,number,number],
  inflate:0,source_pattern_id:"p",instance_index:index,
}));
const compiled:CompiledAuthoringRecipe={
  schema:1,compiler_version:1,recipe_id:"chain",placements,symmetry_relationships:[],
  metrics:{prototype_count:1,pattern_count:1,instance_count:12,realized_cube_count:12,unique_geometry_count:1,repeated_instance_count:11,symmetry_generated_count:0},
};
const intent={kind:"CHAIN" as const,id:"spine",name_prefix:"spine",instance_ids:placements.map(p=>p.id)};
const plan=compileSemanticRig(compiled,[intent]);
const explicit=plan.bones.map(b=>({name:b.name,origin:b.origin,parent:b.parent}));
const result={
  bones:plan.bones.length,
  explicit_payload_bytes:bytes(explicit),
  semantic_intent_bytes:bytes(intent),
  serialized_payload_proxy_reduction:1-bytes(intent)/bytes(explicit),
};
console.log(JSON.stringify(result,null,2));
if(result.serialized_payload_proxy_reduction<0.4) throw new Error("Semantic rig payload proxy reduction regressed below 40%.");
