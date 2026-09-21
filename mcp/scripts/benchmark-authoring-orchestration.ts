import { planAuthoringImpact } from "@/lib/orchestration/authoringImpact";
import { compileMinimalVerificationPlan } from "@/lib/orchestration/verificationPlan";
import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";

function bytes(value:unknown){return new TextEncoder().encode(JSON.stringify(value)).length;}

function recipe(size:number):AuthoringRecipe{
  return {
    schema:1,compiler_version:1,id:"bench",name:"bench",
    prototypes:[{id:"p",name:"panel",size:[size,4,1],semantic_group:"metal"}],
    patterns:[{kind:"LINEAR",id:"grid",prototype_id:"p",count:32,axis:"X",spacing:5,semantic_group:"metal"}],
  };
}

const impact=planAuthoringImpact(recipe(4),recipe(4.5));
const verification=compileMinimalVerificationPlan(impact);
const fullReviewProxy={
  geometry:"all",
  uv:"all",
  rig:"all",
  texture:"all",
  animation:"all",
  instances:Array.from({length:32},(_,i)=>"grid:"+i),
};
const bounded={impact,verification};
const result={
  full_review_proxy_bytes:bytes(fullReviewProxy),
  bounded_plan_bytes:bytes(bounded),
  serialized_plan_proxy_reduction:1-bytes(bounded)/bytes(fullReviewProxy),
  verification_tasks:verification.length,
};
console.log(JSON.stringify(result,null,2));
if(verification.length>5) throw new Error("Orchestration verification task count expanded unexpectedly.");
