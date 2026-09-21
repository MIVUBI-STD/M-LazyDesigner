import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import { compileAuthoringRecipe } from "@/lib/authoringRecipe/compiler";
import { planIncrementalRecipeRebuild } from "@/lib/authoringRecipe/incremental";
import { expandAffectedUvIds } from "@/lib/uv/authoringRecipeUv";

export type DownstreamAuthoringOwnership={rig_instance_ids?:readonly string[];animation_instance_ids?:readonly string[]};
export type AuthoringImpactPlan={
  geometry:{upsert_instance_ids:string[];remove_instance_ids:string[];metadata_only_instance_ids:string[];preserved_instance_ids:string[]};
  uv:{stale:boolean;affected_island_ids:string[];scope:"AFFECTED_ONLY"|"FULL_SEMANTIC_REPLAN"|"UNCHANGED"};
  rig:{stale:boolean;affected_instance_ids:string[];scope:"AFFECTED_ONLY"|"FULL_SEMANTIC_REPLAN"|"UNCHANGED"};
  animation:{stale:boolean;affected_instance_ids:string[];scope:"AFFECTED_ONLY"|"FULL_SEMANTIC_REVIEW"|"UNCHANGED"};
  texture:{stale:boolean;reason:"UV_CHANGED"|"SEMANTIC_MATERIAL_CHANGED"|"SYMMETRY_POLICY_CHANGED"|"UNCHANGED";scope:"AFFECTED_SURFACES"|"SEMANTIC_REVIEW"|"UNCHANGED"};
  symmetry_changed_relation_ids:string[];
};
function exactAffected(semanticAffected:readonly string[],ownership:readonly string[]|undefined):string[]|null{
  if(!ownership) return null;
  const owned=new Set(ownership);
  return semanticAffected.filter((id)=>owned.has(id)).sort();
}
export function planAuthoringImpact(previousRecipe:AuthoringRecipe,nextRecipe:AuthoringRecipe,ownership:DownstreamAuthoringOwnership={}):AuthoringImpactPlan{
  const diff=planIncrementalRecipeRebuild(previousRecipe,nextRecipe);
  const next=compileAuthoringRecipe(nextRecipe);
  const nextIds=new Set(next.placements.map((placement)=>placement.id));
  const nativeAffected=[...diff.upserts.map((placement)=>placement.id),...diff.remove_instance_ids].sort();
  const semanticAffected=[...new Set([...nativeAffected,...diff.metadata_only_instance_ids])].sort();
  const uvAffected=nativeAffected.length>0?expandAffectedUvIds(next,nativeAffected.filter((id)=>nextIds.has(id))):[];
  const semanticGroupChanged=diff.metadata_fields_changed.some((entry)=>entry.fields.includes("semantic_group"));
  const removalRequiresUvReplan=diff.remove_instance_ids.length>0;
  const uvScope=(diff.semantic_invalidation.uv_mapping||removalRequiresUvReplan)&&uvAffected.length===0?"FULL_SEMANTIC_REPLAN":uvAffected.length>0?"AFFECTED_ONLY":"UNCHANGED";
  const rigAffected=exactAffected(semanticAffected,ownership.rig_instance_ids);
  const rigPotentiallyStale=semanticAffected.length>0||diff.semantic_invalidation.animation_motion;
  const rigScope=!rigPotentiallyStale?"UNCHANGED":rigAffected===null?"FULL_SEMANTIC_REPLAN":rigAffected.length>0?"AFFECTED_ONLY":diff.semantic_invalidation.animation_motion?"FULL_SEMANTIC_REPLAN":"UNCHANGED";
  const animationAffected=exactAffected(semanticAffected,ownership.animation_instance_ids);
  const animationPotentiallyStale=semanticAffected.length>0||diff.semantic_invalidation.animation_motion;
  const animationScope=!animationPotentiallyStale?"UNCHANGED":animationAffected===null?"FULL_SEMANTIC_REVIEW":animationAffected.length>0?"AFFECTED_ONLY":diff.semantic_invalidation.animation_motion?"FULL_SEMANTIC_REVIEW":"UNCHANGED";
  const textureReason=semanticGroupChanged?"SEMANTIC_MATERIAL_CHANGED":diff.semantic_invalidation.texture_appearance&&diff.symmetry_changed_relation_ids.length>0?"SYMMETRY_POLICY_CHANGED":uvScope!=="UNCHANGED"?"UV_CHANGED":"UNCHANGED";
  return {
    geometry:{upsert_instance_ids:diff.upserts.map((placement)=>placement.id),remove_instance_ids:diff.remove_instance_ids,metadata_only_instance_ids:diff.metadata_only_instance_ids,preserved_instance_ids:diff.preserved_instance_ids},
    uv:{stale:uvScope!=="UNCHANGED",affected_island_ids:uvAffected,scope:uvScope},
    rig:{stale:rigScope!=="UNCHANGED",affected_instance_ids:rigAffected??[],scope:rigScope},
    animation:{stale:animationScope!=="UNCHANGED",affected_instance_ids:animationAffected??[],scope:animationScope},
    texture:{stale:textureReason!=="UNCHANGED",reason:textureReason,scope:textureReason==="UNCHANGED"?"UNCHANGED":textureReason==="UV_CHANGED"?"AFFECTED_SURFACES":"SEMANTIC_REVIEW"},
    symmetry_changed_relation_ids:diff.symmetry_changed_relation_ids,
  };
}
