import type {
  SemanticGeometryOperation,
  SemanticGeometryTarget,
} from "@/lib/authoringRecipe/semanticEdit";

export const MAX_AUTHORING_INTENT_OPERATIONS = 16 as const;
export const MAX_AUTHORING_INTENT_TARGET_IDS = 64 as const;

export type AuthoringPreserveRequest =
  | "RIG_PIVOTS"
  | "UV_DENSITY"
  | "TEXTURE_APPEARANCE"
  | "ANIMATION_MOTION"
  | "SYMMETRY";

export type CompactAuthoringIntent = {
  action: "MODIFY";
  target: SemanticGeometryTarget;
  geometry_operations: readonly SemanticGeometryOperation[];
  preserve?: readonly AuthoringPreserveRequest[];
};

export function validateCompactAuthoringIntent(intent: CompactAuthoringIntent): void {
  if (intent.geometry_operations.length === 0) {
    throw new Error("Authoring intent requires at least one geometry operation.");
  }
  if (intent.geometry_operations.length > MAX_AUTHORING_INTENT_OPERATIONS) {
    throw new Error(
      `Authoring intent exceeds the ${MAX_AUTHORING_INTENT_OPERATIONS}-operation budget.`
    );
  }
  if (
    intent.target.instance_ids &&
    intent.target.instance_ids.length > MAX_AUTHORING_INTENT_TARGET_IDS
  ) {
    throw new Error(
      `Authoring intent exceeds the ${MAX_AUTHORING_INTENT_TARGET_IDS}-target budget.`
    );
  }
  const preserve = intent.preserve ?? [];
  if (new Set(preserve).size !== preserve.length) {
    throw new Error("Authoring preserve requests must be unique.");
  }
}
