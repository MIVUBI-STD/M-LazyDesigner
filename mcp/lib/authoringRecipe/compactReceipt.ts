import type { AuthoringRecipeApplyReceipt } from "@/lib/authoringRecipe/transaction";
import type { SemanticIdentityResolution } from "@/lib/authoringRecipe/semanticIdentity";
import type { AuthoringEvidenceHandle } from "@/lib/authoringRecipe/evidenceRegistry";

const EXAMPLE_LIMIT = 8;

function examples(values: readonly string[]) {
  return {
    count: values.length,
    examples: values.slice(0, EXAMPLE_LIMIT),
    examples_truncated: values.length > EXAMPLE_LIMIT,
  };
}

export function compactSemanticIdentityResolution(
  resolution: SemanticIdentityResolution,
  handle: AuthoringEvidenceHandle
) {
  return {
    evidence_handle: handle,
    recipe_id: resolution.recipe_id,
    selected_by: resolution.selected_by,
    count: resolution.count,
    instance_ids: examples(resolution.identities.map((entry) => entry.instance_id)),
  };
}

export function compactAuthoringApplyReceipt(
  receipt: AuthoringRecipeApplyReceipt,
  handle: AuthoringEvidenceHandle
) {
  return {
    evidence_handle: handle,
    execution: receipt.execution,
    recipe_id: receipt.recipe_id,
    affected_count: receipt.affected_count,
    recipe_affected_count: receipt.recipe_affected_count,
    created: examples(receipt.created_instance_ids),
    updated: examples(receipt.updated_instance_ids),
    removed: examples(receipt.removed_instance_ids),
    metadata_only: examples(receipt.metadata_only_instance_ids),
    preserved_count: receipt.preserved_instance_ids.length,
    invalidates: receipt.invalidates,
    native_source_fingerprint_after: receipt.native_source_fingerprint_after,
  };
}
