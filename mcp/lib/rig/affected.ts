import type { CompiledAuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import type { SemanticRigPlan } from "@/lib/rig/semanticRig";

export function affectedRigBoneIds(
  compiled: CompiledAuthoringRecipe,
  plan: SemanticRigPlan,
  affectedInstanceIds: readonly string[]
): string[] {
  const affectedInstances = new Set(affectedInstanceIds);
  for (const relation of compiled.symmetry_relationships) {
    if (relation.rig_policy !== "MIRROR") continue;
    if (affectedInstances.has(relation.source_instance_id) || affectedInstances.has(relation.target_instance_id)) {
      affectedInstances.add(relation.source_instance_id);
      affectedInstances.add(relation.target_instance_id);
    }
  }
  return plan.bones
    .filter((bone) => bone.source_instance_ids.some((id) => affectedInstances.has(id)))
    .map((bone) => bone.id)
    .sort();
}
