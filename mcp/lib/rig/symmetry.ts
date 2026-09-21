import type { CompiledAuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import type { RigBonePlan, SemanticRigPlan } from "@/lib/rig/semanticRig";

const AXIS = { X: 0, Y: 1, Z: 2 } as const;

export type MirroredRigRequest = {
  source_bone_id: string;
  relation_id: string;
  target_bone_id: string;
  target_name: string;
  target_parent?: string;
};

export function mirrorRigBoneFromRecipe(
  compiled: CompiledAuthoringRecipe,
  plan: SemanticRigPlan,
  request: MirroredRigRequest
): RigBonePlan {
  const source = plan.bones.find((bone) => bone.id === request.source_bone_id);
  if (!source) throw new Error("Mirrored rig source bone is missing: " + request.source_bone_id + ".");
  const relation = compiled.symmetry_relationships.find((entry) => entry.id === request.relation_id);
  if (!relation) throw new Error("Mirrored rig relation is missing: " + request.relation_id + ".");
  if (relation.rig_policy !== "MIRROR") throw new Error("Rig mirror request requires relation.rig_policy=MIRROR.");
  if (!source.source_instance_ids.includes(relation.source_instance_id)) {
    throw new Error("Rig mirror source bone is not owned by the symmetry source instance.");
  }
  const origin = [...source.origin] as [number, number, number];
  const axis = AXIS[relation.plane.axis];
  origin[axis] = relation.plane.position * 2 - origin[axis];
  return {
    id: request.target_bone_id,
    name: request.target_name,
    origin,
    rotation: [0, 0, 0],
    parent: request.target_parent ?? source.parent,
    source_instance_ids: [relation.target_instance_id],
  };
}
