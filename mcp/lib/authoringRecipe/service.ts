import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import { compileAuthoringRecipe } from "@/lib/authoringRecipe/compiler";
import { planIncrementalRecipeRebuild } from "@/lib/authoringRecipe/incremental";
import {
  compileSemanticGeometryEdit,
  type SemanticGeometryEditIntent,
} from "@/lib/authoringRecipe/semanticEdit";
import { rewriteAuthoringRecipeForSemanticEdit } from "@/lib/authoringRecipe/semanticRewrite";
import {
  evaluateSemanticOperationStack,
  type SemanticOperationStack,
} from "@/lib/authoringRecipe/operationStack";
import {
  instantiateAuthoringAssets,
  type AuthoringAssetDefinition,
  type AuthoringAssetInstance,
} from "@/lib/authoringRecipe/assets";
import {
  compileReferenceCorrectionsToGeometryIntents,
  deriveReferenceCorrectionVectors,
  type ReferenceDeviation,
} from "@/lib/referenceCorrection";
import {
  selectLowestCostCorrection,
  type CorrectionCandidate,
  type CorrectionSolverOptions,
} from "@/lib/correctionSolver";
import {
  assertAuthoringRecipeNativeMatchesCompiled,
  fingerprintAuthoringRecipeNativeSnapshot,
  type AuthoringRecipeNativeSnapshot,
} from "@/lib/authoringRecipe/nativeState";
import {
  applyAuthoringRecipeIncrementalAtomic,
  type AuthoringRecipeApplyAdapter,
} from "@/lib/authoringRecipe/transaction";
import { AuthoringRecipePlanRegistry } from "@/lib/authoringRecipe/planRegistry";

const EXAMPLE_LIMIT = 12;
function bounded(values: readonly string[]) {
  return { count: values.length, examples: values.slice(0, EXAMPLE_LIMIT), examples_truncated: values.length > EXAMPLE_LIMIT };
}
export function summarizeAuthoringRecipeRebuild(rebuild: ReturnType<typeof planIncrementalRecipeRebuild>) {
  return {
    previous_cube_count: rebuild.metrics.previous_cube_count,
    next_cube_count: rebuild.metrics.next_cube_count,
    native_affected_count: rebuild.metrics.native_affected_count,
    native_affected_ratio_of_next: rebuild.metrics.native_affected_ratio_of_next,
    recipe_affected_count: rebuild.metrics.affected_count,
    upserts: bounded(rebuild.upserts.map((placement) => placement.id)),
    removals: bounded(rebuild.remove_instance_ids),
    metadata_only: bounded(rebuild.metadata_only_instance_ids),
    symmetry_changes: bounded(rebuild.symmetry_changed_relation_ids),
    preserved_count: rebuild.preserved_instance_ids.length,
    semantic_invalidation: { ...rebuild.semantic_invalidation },
  };
}

export function planSemanticGeometryEdit(recipe: AuthoringRecipe, intent: SemanticGeometryEditIntent) {
  return compileSemanticGeometryEdit(compileAuthoringRecipe(recipe), intent);
}
export function rewriteSemanticGeometryRecipe(recipe: AuthoringRecipe, intent: SemanticGeometryEditIntent) {
  const nextRecipe = rewriteAuthoringRecipeForSemanticEdit(recipe, intent);
  return { next_recipe: nextRecipe, rebuild: planIncrementalRecipeRebuild(recipe, nextRecipe) };
}
export function evaluateSemanticGeometryStack(recipe:AuthoringRecipe,stack:SemanticOperationStack){
  return evaluateSemanticOperationStack(recipe,stack);
}
export function composeReusableAuthoringAssets(
  root:Pick<AuthoringRecipe,"schema"|"compiler_version"|"id"|"name">,
  definitions:readonly AuthoringAssetDefinition[],
  instances:readonly AuthoringAssetInstance[]
){
  return instantiateAuthoringAssets(root,definitions,instances);
}
export function planReferenceGeometryCorrections(recipe: AuthoringRecipe, deviations: readonly ReferenceDeviation[]) {
  const compiled = compileAuthoringRecipe(recipe);
  const corrections = deriveReferenceCorrectionVectors(deviations);
  const intents = compileReferenceCorrectionsToGeometryIntents(corrections);
  const plans = intents.map((intent) => compileSemanticGeometryEdit(compiled, intent));
  return { corrections, intents, plans };
}
export function chooseBoundedGeometryCorrection<T>(candidates: readonly CorrectionCandidate<T>[], options?: CorrectionSolverOptions) {
  return selectLowestCostCorrection(candidates, options);
}

export type AuthoringRecipeServiceDependencies = {
  readOwned(recipeId: string): Promise<AuthoringRecipeNativeSnapshot> | AuthoringRecipeNativeSnapshot;
  readStoredRecipe?(recipeId: string): Promise<AuthoringRecipe | null> | AuthoringRecipe | null;
  createApplyAdapter(recipeId: string): AuthoringRecipeApplyAdapter;
};
export function createAuthoringRecipeService(
  dependencies: AuthoringRecipeServiceDependencies,
  registry = new AuthoringRecipePlanRegistry()
) {
  const planPair = async (previousRecipe: AuthoringRecipe, nextRecipe: AuthoringRecipe) => {
    if (previousRecipe.id !== nextRecipe.id) throw new Error("Parametric authoring plan requires stable recipe identity.");
    const native = await dependencies.readOwned(previousRecipe.id);
    assertAuthoringRecipeNativeMatchesCompiled(native, previousRecipe);
    const nativeFingerprint = fingerprintAuthoringRecipeNativeSnapshot(native);
    const rebuild = planIncrementalRecipeRebuild(previousRecipe, nextRecipe);
    const stored = registry.put({ native_source_fingerprint: nativeFingerprint, previous_recipe: previousRecipe, next_recipe: nextRecipe, rebuild });
    return { plan_id: stored.plan_id, native_source_fingerprint: nativeFingerprint, summary: summarizeAuthoringRecipeRebuild(rebuild) };
  };
  return {
    plan: planPair,
    async planStored(nextRecipe: AuthoringRecipe) {
      if (!dependencies.readStoredRecipe) throw new Error("RECIPE_STORE_UNAVAILABLE: Runtime did not provide project recipe persistence.");
      const previousRecipe = await dependencies.readStoredRecipe(nextRecipe.id);
      if (!previousRecipe) throw new Error("RECIPE_NOT_STORED: no previous recipe source exists for " + nextRecipe.id + "; use explicit previous/next planning for first adoption.");
      return planPair(previousRecipe, nextRecipe);
    },
    async apply(input: { plan_id: string; expected_native_source_fingerprint: string }) {
      const stored = registry.get(input.plan_id);
      if (stored.native_source_fingerprint !== input.expected_native_source_fingerprint) throw new Error("STALE_RECIPE_PLAN: supplied native fingerprint does not match the stored plan.");
      return applyAuthoringRecipeIncrementalAtomic(stored.previous_recipe, stored.next_recipe, stored.native_source_fingerprint, dependencies.createApplyAdapter(stored.next_recipe.id));
    },
    registrySize() { return registry.size(); },
  };
}
