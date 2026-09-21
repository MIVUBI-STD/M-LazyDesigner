import { planAuthoringImpact } from "@/lib/orchestration/authoringImpact";
import { compileMinimalVerificationPlan } from "@/lib/orchestration/verificationPlan";
import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";

function recipe(width:number):AuthoringRecipe{
  return {
    schema:1,compiler_version:1,id:"bench",name:"bench",
    prototypes:[{id:"p",name:"panel",size:[width,4,1],semantic_group:"metal"}],
    patterns:[{kind:"LINEAR",id:"grid",prototype_id:"p",count:32,axis:"X",spacing:5,semantic_group:"metal"}],
  };
}

const ownedRig=["grid:0","grid:1"];
const ownedAnimation=["grid:0"];
const impact=planAuthoringImpact(recipe(4),recipe(4.5),{
  rig_instance_ids:ownedRig,
  animation_instance_ids:ownedAnimation,
});
const verification=compileMinimalVerificationPlan(impact);
const result={
  geometry_affected:impact.geometry.upsert_instance_ids.length,
  rig_affected:impact.rig.affected_instance_ids,
  animation_affected:impact.animation.affected_instance_ids,
  uv_scope:impact.uv.scope,
  texture_scope:impact.texture.scope,
  verification_tasks:verification.length,
};
console.log(JSON.stringify(result,null,2));

if(impact.rig.scope!=="AFFECTED_ONLY" || impact.rig.affected_instance_ids.length!==2){
  throw new Error("Orchestration widened or lost known rig ownership.");
}
if(impact.animation.scope!=="AFFECTED_ONLY" || impact.animation.affected_instance_ids.length!==1){
  throw new Error("Orchestration widened or lost known animation ownership.");
}
if(verification.length>5) throw new Error("Orchestration verification task count expanded unexpectedly.");
