import type { SemanticRigPlan } from "@/lib/rig/semanticRig";

export type AddGroupBatchEntry = {
  name: string;
  origin: [number, number, number];
  rotation: [number, number, number];
  parent: string;
};

export function compileSemanticRigToAddGroupBatch(plan: SemanticRigPlan) {
  const available = new Set<string>();
  const entries: AddGroupBatchEntry[] = [];

  for (const bone of plan.bones) {
    if (bone.parent !== "root" && !available.has(bone.parent)) {
      throw new Error(
        "Semantic rig parent " + bone.parent + " must be root or an earlier bone in the same batch."
      );
    }
    entries.push({
      name: bone.name,
      origin: [...bone.origin],
      rotation: [...bone.rotation],
      parent: bone.parent,
    });
    available.add(bone.name);
  }

  return { groups: entries };
}
