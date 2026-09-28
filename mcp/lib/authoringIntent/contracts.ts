import type {
  SemanticGeometryOperation,
  SemanticGeometryTarget,
} from "@/lib/authoringRecipe/semanticEdit";

export const MAX_AUTHORING_INTENT_OPERATIONS = 16 as const;
export const MAX_AUTHORING_INTENT_TARGET_IDS = 64 as const;

export type VisualDifferenceCriterion =
  | "SILHOUETTE"
  | "PROPORTION"
  | "PLACEMENT"
  | "ORIENTATION"
  | "CONTACT"
  | "TOPOLOGY"
  | "NEGATIVE_SPACE"
  | "COUNT"
  | "DEPTH"
  | "LAYERING";

export type VisualDifferenceSeverity = "CRITICAL" | "MAJOR" | "MINOR";

export type VisualCorrectionFamily =
  | "TRANSLATE"
  | "RESIZE"
  | "ROTATE"
  | "REATTACH"
  | "LAYER_OFFSET"
  | "SPLIT"
  | "MERGE_REMOVE"
  | "ADD_MASS";

export type CompactVisualDifference = {
  criterion: VisualDifferenceCriterion;
  severity: VisualDifferenceSeverity;
  view: string;
  delta: string;
  claim_id?: string;
};

export type AuthoringPreserveRequest =
  | "RIG_PIVOTS"
  | "UV_DENSITY"
  | "TEXTURE_APPEARANCE"
  | "ANIMATION_MOTION"
  | "SYMMETRY";

export type CompactAuthoringIntent = {
  action: "MODIFY";
  target: SemanticGeometryTarget;
  difference?: CompactVisualDifference;
  correction_family?: VisualCorrectionFamily;
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
  const hasDifference = intent.difference !== undefined;
  const hasCorrectionFamily = intent.correction_family !== undefined;
  if (hasDifference !== hasCorrectionFamily) {
    throw new Error(
      "Visual difference and correction_family must be provided together."
    );
  }
  if (intent.difference) {
    if (
      intent.difference.view.trim().length === 0 ||
      intent.difference.view.length > 48
    ) {
      throw new Error(
        "Visual difference view must be a non-empty string of at most 48 characters."
      );
    }
    if (
      intent.difference.delta.trim().length === 0 ||
      intent.difference.delta.length > 160
    ) {
      throw new Error(
        "Visual difference delta must be a non-empty string of at most 160 characters."
      );
    }
    if (
      intent.difference.claim_id !== undefined &&
      (intent.difference.claim_id.trim().length === 0 ||
        intent.difference.claim_id.length > 64)
    ) {
      throw new Error(
        "Visual difference claim_id must be non-empty and at most 64 characters when provided."
      );
    }
  }

  const preserve = intent.preserve ?? [];
  if (new Set(preserve).size !== preserve.length) {
    throw new Error("Authoring preserve requests must be unique.");
  }
}
