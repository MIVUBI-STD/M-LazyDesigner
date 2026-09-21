import type { RigBonePlan, SemanticRigPlan } from "@/lib/rig/semanticRig";

function sameBone(a: RigBonePlan, b: RigBonePlan): boolean {
  return (
    a.name === b.name &&
    a.parent === b.parent &&
    a.origin.every((value, index) => value === b.origin[index]) &&
    a.rotation.every((value, index) => value === b.rotation[index]) &&
    a.source_instance_ids.join("|") === b.source_instance_ids.join("|")
  );
}

export function diffSemanticRig(previous: SemanticRigPlan, next: SemanticRigPlan) {
  const before = new Map(previous.bones.map((bone) => [bone.id, bone]));
  const after = new Map(next.bones.map((bone) => [bone.id, bone]));
  const upserts: RigBonePlan[] = [];
  const removals: string[] = [];
  const unchanged: string[] = [];
  for (const [id, bone] of after) {
    const old = before.get(id);
    if (!old || !sameBone(old, bone)) upserts.push(bone);
    else unchanged.push(id);
  }
  for (const id of before.keys()) if (!after.has(id)) removals.push(id);
  return {
    upserts: upserts.sort((a, b) => a.id.localeCompare(b.id)),
    removals: removals.sort(),
    unchanged: unchanged.sort(),
  };
}
