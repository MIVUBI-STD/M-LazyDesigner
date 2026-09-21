import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import { planIncrementalRecipeRebuild } from "@/lib/authoringRecipe/incremental";
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
  return {
    count: values.length,
    examples: values.slice(0, EXAMPLE_LIMIT),
    examples_truncated: values.length > EXAMPLE_LIMIT,
  };
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

export type AuthoringRecipeServiceDependencies = {
  readOwned(recipeId: string): Promise<AuthoringRecipeNativeSnapshot> | AuthoringRecipeNativeSnapshot;
  createApplyAdapter(recipeId: string): AuthoringRecipeApplyAdapter;
};

export function createAuthoringRecipeService(
  dependencies: AuthoringRecipeServiceDependencies,
  registry = new AuthoringRecipePlanRegistry()
) {
  return {
    async plan(previousRecipe: AuthoringRecipe, nextRecipe: AuthoringRecipe) {
      if (previousRecipe.id !== nextRecipe.id) {
        throw new Error("Parametric authoring plan requires stable recipe identity.");
      }
      const native = await dependencies.readOwned(previousRecipe.id);
      assertAuthoringRecipeNativeMatchesCompiled(native, previousRecipe);
      const nativeFingerprint = fingerprintAuthoringRecipeNativeSnapshot(native);
      const rebuild = planIncrementalRecipeRebuild(previousRecipe, nextRecipe);
      const stored = registry.put({
        native_source_fingerprint: nativeFingerprint,
        previous_recipe: previousRecipe,
        next_recipe: nextRecipe,
        rebuild,
      });
      return {
        plan_id: stored.plan_id,
        native_source_fingerprint: nativeFingerprint,
        summary: summarizeAuthoringRecipeRebuild(rebuild),
      };
    },

    async apply(input: { plan_id: string; expected_native_source_fingerprint: string }) {
      const stored = registry.get(input.plan_id);
      if (stored.native_source_fingerprint !== input.expected_native_source_fingerprint) {
        throw new Error("STALE_RECIPE_PLAN: supplied native fingerprint does not match the stored plan.");
      }
      return applyAuthoringRecipeIncrementalAtomic(
        stored.previous_recipe,
        stored.next_recipe,
        stored.native_source_fingerprint,
        dependencies.createApplyAdapter(stored.next_recipe.id)
      );
    },

    registrySize() { return registry.size(); },
  };
}
