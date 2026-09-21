import type { CompiledAuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import type { RigBonePlan, SemanticRigPlan } from "@/lib/rig/semanticRig";
import { compileMechanicalRigIntent } from "@/lib/rig/mechanicalTemplates";
import {
  compileHighConfidenceFunctionalRig,
  inferFunctionalRigHints,
} from "@/lib/rig/functionalInference";

export type AddGroupBatchEntry = {
  name: string;
  origin: [number, number, number];
  rotation: [number, number, number];
  parent: string;
};

function compileBonePlansToAddGroupBatch(bones:readonly RigBonePlan[]){
  const names = new Set<string>();
  const entries: AddGroupBatchEntry[] = [];

  for (const bone of bones) {
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

export function compileSemanticRigToAddGroupBatch(plan: SemanticRigPlan) {
  return compileBonePlansToAddGroupBatch(plan.bones);
}

export function compileFunctionalRigToAddGroupBatch(
  compiled:CompiledAuthoringRecipe,
  minimumConfidence=0.8
){
  const hints=inferFunctionalRigHints(compiled);
  const intents=compileHighConfidenceFunctionalRig(hints,minimumConfidence);
  const bones=intents.map((intent)=>compileMechanicalRigIntent(compiled,intent));
  return {
    ...compileBonePlansToAddGroupBatch(bones),
    hints,
    compiled_intent_count:intents.length,
  };
}
