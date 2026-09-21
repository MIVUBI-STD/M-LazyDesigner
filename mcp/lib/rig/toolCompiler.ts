import type { SemanticRigPlan } from "@/lib/rig/semanticRig";

export type AddGroupBatchEntry = {
  name: string;
  origin: [number, number, number];
  rotation: [number, number, number];
  parent: string;
};

export function compileSemanticRigToAddGroupBatch(plan: SemanticRigPlan) {
  const names = new Set<string>();
  const entries: AddGroupBatchEntry[] = [];

  for (const bone of plan.bones) {
    if (names.has(bone.name.toLowerCase())) {
      throw new Error("Semantic rig batch contains a duplicate case-insensitive bone name: " + bone.name + ".");
    }
    entries.push({
      name: bone.name,
      origin: [...bone.origin],
      rotation: [...bone.rotation],
      parent: bone.parent,
    });
    names.add(bone.name.toLowerCase());
  }

  return { groups: entries };
}
