import { createHash } from "node:crypto";
import type { ControlStageContext } from "./contextProjection";

export const CONTROL_STAGE_CONTEXT_HEADROOM_BYTES = 4096;

export type ControlStageContextHeadroomState =
  | "WITHIN_BUDGET"
  | "BOUNDED"
  | "REQUIRED_OVER_BUDGET";

export type ProjectedControlStageContext = {
  context_type: ControlStageContext["context_type"];
  context_hash: string;
  original_user_intent: string | null;
  current_user_delta: string | null;
  selected_profile: string | null;
  reference_package_id_or_hash: string | null;
  workspace_revision_or_hash: string | null;
  stage_readiness: string | null;
  blocking_unknowns: string[];
  requirements: ControlStageContext["requirements"];
  workspace: {
    asset: string | null;
    current_stage: string | null;
    gates: ControlStageContext["workspace"]["gates"];
    next_step?: string | null;
  };
  non_blocking_unknowns_relevant_to_stage?: string[];
  reference_document?: string | null;
  reference_image_ids?: string[];
  headroom_state?: "REQUIRED_OVER_BUDGET";
};

export type ControlStageContextHeadroomDiagnostics = {
  budget_bytes: number;
  before_bytes: number;
  after_bytes: number;
  required_bytes: number;
  useful_bytes: number;
  optional_bytes: number;
  dropped_optional_fields: string[];
  dropped_useful_items: number;
  required_over_budget: boolean;
  state: ControlStageContextHeadroomState;
  projection_hash: string;
};

function serializedUtf8Bytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function projectionHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function requiredProjection(
  context: ControlStageContext
): ProjectedControlStageContext {
  return {
    context_type: context.context_type,
    context_hash: context.context_hash,
    original_user_intent: context.original_user_intent,
    current_user_delta: context.current_user_delta,
    selected_profile: context.selected_profile,
    reference_package_id_or_hash: context.reference_package_id_or_hash,
    workspace_revision_or_hash: context.workspace_revision_or_hash,
    stage_readiness: context.stage_readiness,
    blocking_unknowns: [...context.blocking_unknowns],
    requirements: context.requirements,
    workspace: {
      asset: context.workspace.asset,
      current_stage: context.workspace.current_stage,
      gates: context.workspace.gates,
    },
  };
}

function fitsBudget(value: unknown, budgetBytes: number): boolean {
  return serializedUtf8Bytes(value) <= budgetBytes;
}

function addArrayItemsWithinBudget(
  base: ProjectedControlStageContext,
  field: "non_blocking_unknowns_relevant_to_stage" | "reference_image_ids",
  values: readonly string[],
  budgetBytes: number
): { context: ProjectedControlStageContext; dropped: number } {
  if (values.length === 0) return { context: base, dropped: 0 };

  let projected = base;
  let accepted = 0;
  for (const value of values) {
    const current = projected[field] ?? [];
    const candidate = { ...projected, [field]: [...current, value] };
    if (!fitsBudget(candidate, budgetBytes)) break;
    projected = candidate;
    accepted += 1;
  }
  return { context: projected, dropped: values.length - accepted };
}

/**
 * Deterministic AI-facing stage-context projection.
 *
 * Canonical Control/reference/workspace state remains complete. This projection
 * only prevents useful/optional model-facing context from expanding without a
 * bound. REQUIRED evidence always wins over the byte proxy budget.
 */
export function projectControlStageContextWithHeadroom(
  context: ControlStageContext,
  budgetBytes: number = CONTROL_STAGE_CONTEXT_HEADROOM_BYTES
): {
  context: ProjectedControlStageContext;
  diagnostics: ControlStageContextHeadroomDiagnostics;
} {
  const normalizedBudget = Number.isFinite(budgetBytes)
    ? Math.max(1, Math.trunc(budgetBytes))
    : CONTROL_STAGE_CONTEXT_HEADROOM_BYTES;
  const beforeBytes = serializedUtf8Bytes(context);
  const required = requiredProjection(context);
  const requiredBytes = serializedUtf8Bytes(required);

  if (requiredBytes > normalizedBudget) {
    const projected = {
      ...required,
      headroom_state: "REQUIRED_OVER_BUDGET" as const,
    };
    const afterBytes = serializedUtf8Bytes(projected);
    return {
      context: projected,
      diagnostics: {
        budget_bytes: normalizedBudget,
        before_bytes: beforeBytes,
        after_bytes: afterBytes,
        required_bytes: requiredBytes,
        useful_bytes: 0,
        optional_bytes: Math.max(0, beforeBytes - requiredBytes),
        dropped_optional_fields: [
          "non_blocking_unknowns_relevant_to_stage",
          "reference_document",
          "reference_image_ids",
          "workspace.next_step",
        ],
        dropped_useful_items:
          context.non_blocking_unknowns_relevant_to_stage.length +
          context.reference_image_ids.length +
          (context.reference_document ? 1 : 0) +
          (context.workspace.next_step ? 1 : 0),
        required_over_budget: true,
        state: "REQUIRED_OVER_BUDGET",
        projection_hash: projectionHash(projected),
      },
    };
  }

  let projected = required;
  let droppedUsefulItems = 0;
  const droppedOptionalFields: string[] = [];

  const unknowns = addArrayItemsWithinBudget(
    projected,
    "non_blocking_unknowns_relevant_to_stage",
    context.non_blocking_unknowns_relevant_to_stage,
    normalizedBudget
  );
  projected = unknowns.context;
  droppedUsefulItems += unknowns.dropped;
  if (unknowns.dropped > 0) {
    droppedOptionalFields.push("non_blocking_unknowns_relevant_to_stage");
  }

  if (context.reference_document) {
    const candidate = { ...projected, reference_document: context.reference_document };
    if (fitsBudget(candidate, normalizedBudget)) projected = candidate;
    else {
      droppedUsefulItems += 1;
      droppedOptionalFields.push("reference_document");
    }
  }

  const images = addArrayItemsWithinBudget(
    projected,
    "reference_image_ids",
    context.reference_image_ids,
    normalizedBudget
  );
  projected = images.context;
  droppedUsefulItems += images.dropped;
  if (images.dropped > 0) droppedOptionalFields.push("reference_image_ids");

  if (context.workspace.next_step) {
    const candidate = {
      ...projected,
      workspace: {
        ...projected.workspace,
        next_step: context.workspace.next_step,
      },
    };
    if (fitsBudget(candidate, normalizedBudget)) projected = candidate;
    else {
      droppedUsefulItems += 1;
      droppedOptionalFields.push("workspace.next_step");
    }
  }

  const afterBytes = serializedUtf8Bytes(projected);
  const state: ControlStageContextHeadroomState =
    droppedUsefulItems > 0 || beforeBytes > afterBytes
      ? "BOUNDED"
      : "WITHIN_BUDGET";

  return {
    context: projected,
    diagnostics: {
      budget_bytes: normalizedBudget,
      before_bytes: beforeBytes,
      after_bytes: afterBytes,
      required_bytes: requiredBytes,
      useful_bytes: Math.max(0, afterBytes - requiredBytes),
      optional_bytes: Math.max(0, beforeBytes - requiredBytes),
      dropped_optional_fields: droppedOptionalFields,
      dropped_useful_items: droppedUsefulItems,
      required_over_budget: false,
      state,
      projection_hash: projectionHash(projected),
    },
  };
}
