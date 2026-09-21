import { compileMotionRecipe } from "@/lib/animation/motionRecipe";
import { compileMotionToCreateAnimation } from "@/lib/animation/toolCompiler";

function bytes(value:unknown){return new TextEncoder().encode(JSON.stringify(value)).length;}

const poses=Array.from({length:16},(_,i)=>({
  id:"pose_"+i,time:i*0.1,
  bones:{
    arm_L:{rotation:[i*2,0,0] as [number,number,number]},
    arm_R:{rotation:[-i*2,0,0] as [number,number,number]},
    head:{rotation:[0,i,0] as [number,number,number]},
  }
}));
const input={name:"demo",loop:true,poses};
const compiled=compileMotionRecipe(input);
const explicit=compileMotionToCreateAnimation(compiled);
const semanticBytes=bytes(input);
const explicitBytes=bytes(explicit);
const result={
  poses:poses.length,
  bones:Object.keys(compiled.bones).length,
  semantic_payload_bytes:semanticBytes,
  explicit_animation_payload_bytes:explicitBytes,
  serialized_payload_proxy_reduction:1-semanticBytes/explicitBytes,
};
console.log(JSON.stringify(result,null,2));
if(result.serialized_payload_proxy_reduction<0.15) throw new Error("Motion recipe payload proxy reduction regressed below 15%.");
