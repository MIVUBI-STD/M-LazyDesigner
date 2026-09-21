import type { AuthoringRecipe, CompiledCubePlacement } from "@/lib/authoringRecipe/contracts";
import { compileAuthoringRecipe } from "@/lib/authoringRecipe/compiler";
import { planIncrementalRecipeRebuild } from "@/lib/authoringRecipe/incremental";
import {
  assertAuthoringRecipeNativeMatchesCompiled,
  fingerprintAuthoringRecipeNativeSnapshot,
  type AuthoringRecipeNativeSnapshot,
} from "@/lib/authoringRecipe/nativeState";

export type AuthoringRecipeApplyAdapter = {
  readOwned(recipeId: string): Promise<AuthoringRecipeNativeSnapshot> | AuthoringRecipeNativeSnapshot;
  beginUndo?(affectedInstanceIds: readonly string[]): Promise<void> | void;
  upsert(
    placement: CompiledCubePlacement,
    existingUuid: string | null,
    recipeId: string
  ): Promise<string> | string;
  remove(instanceId: string, uuid: string, recipeId: string): Promise<void> | void;
  restore(snapshot: AuthoringRecipeNativeSnapshot): Promise<void> | void;
  commitUndo?(): Promise<void> | void;
  cancelUndo?(): Promise<void> | void;
};

export type AuthoringRecipeApplyReceipt = {
  schema: 1;
  execution: "applied" | "unchanged";
  recipe_id: string;
  previous_recipe_fingerprint: string;
  next_recipe_fingerprint: string;
  native_source_fingerprint_before: string;
  native_source_fingerprint_after: string;
  created_instance_ids: string[];
  updated_instance_ids: string[];
  removed_instance_ids: string[];
  preserved_instance_ids: string[];
  affected_count: number;
  invalidates: {
    geometry_structure: boolean;
    uv_mapping: boolean;
    texture_appearance: boolean;
    animation_motion: boolean;
  };
};

export async function applyAuthoringRecipeIncrementalAtomic(
  previousRecipe: AuthoringRecipe,
  nextRecipe: AuthoringRecipe,
  expectedNativeSourceFingerprint: string,
  adapter: AuthoringRecipeApplyAdapter
): Promise<AuthoringRecipeApplyReceipt> {
  const rebuild = planIncrementalRecipeRebuild(previousRecipe,nextRecipe);
  const before = await adapter.readOwned(previousRecipe.id);
  const actualBeforeFingerprint = fingerprintAuthoringRecipeNativeSnapshot(before);
  if (actualBeforeFingerprint !== expectedNativeSourceFingerprint) {
    throw new Error("STALE_RECIPE_PLAN: native owned state changed after planning.");
  }
  assertAuthoringRecipeNativeMatchesCompiled(before,previousRecipe);

  if (rebuild.metrics.affected_count === 0) {
    return {
      schema: 1, execution: "unchanged", recipe_id: nextRecipe.id,
      previous_recipe_fingerprint: rebuild.previous_recipe_fingerprint,
      next_recipe_fingerprint: rebuild.next_recipe_fingerprint,
      native_source_fingerprint_before: actualBeforeFingerprint,
      native_source_fingerprint_after: actualBeforeFingerprint,
      created_instance_ids: [], updated_instance_ids: [], removed_instance_ids: [],
      preserved_instance_ids: [...rebuild.preserved_instance_ids], affected_count: 0,
      invalidates: { geometry_structure: false, uv_mapping: false, texture_appearance: false, animation_motion: false },
    };
  }

  const beforeByInstance = new Map(before.cubes.map((cube) => [cube.instance_id,cube]));
  const affectedIds = [...new Set([
    ...rebuild.upserts.map((placement) => placement.id),
    ...rebuild.remove_instance_ids,
  ])].sort();
  const created: string[] = [];
  const updated: string[] = [];
  await adapter.beginUndo?.(affectedIds);
  try {
    for (const instanceId of rebuild.remove_instance_ids) {
      const existing = beforeByInstance.get(instanceId);
      if (!existing) throw new Error("RECIPE_APPLY_PRECONDITION_FAILED: removal target " + instanceId + " is missing.");
      await adapter.remove(instanceId, existing.uuid, previousRecipe.id);
    }
    for (const placement of rebuild.upserts) {
      const existing = beforeByInstance.get(placement.id) ?? null;
      const uuid = await adapter.upsert(placement, existing?.uuid ?? null, nextRecipe.id);
      if (!uuid) throw new Error("RECIPE_APPLY_POSTCONDITION_FAILED: adapter returned empty Cube UUID for " + placement.id + ".");
      (existing ? updated : created).push(placement.id);
    }
    const after = await adapter.readOwned(nextRecipe.id);
    assertAuthoringRecipeNativeMatchesCompiled(after,nextRecipe);
    const afterFingerprint = fingerprintAuthoringRecipeNativeSnapshot(after);
    if (afterFingerprint === actualBeforeFingerprint) {
      throw new Error("RECIPE_APPLY_POSTCONDITION_FAILED: affected transaction did not change native owned state.");
    }
    await adapter.commitUndo?.();
    return {
      schema: 1, execution: "applied", recipe_id: nextRecipe.id,
      previous_recipe_fingerprint: rebuild.previous_recipe_fingerprint,
      next_recipe_fingerprint: rebuild.next_recipe_fingerprint,
      native_source_fingerprint_before: actualBeforeFingerprint,
      native_source_fingerprint_after: afterFingerprint,
      created_instance_ids: created.sort(),
      updated_instance_ids: updated.sort(),
      removed_instance_ids: [...rebuild.remove_instance_ids],
      preserved_instance_ids: [...rebuild.preserved_instance_ids],
      affected_count: rebuild.metrics.affected_count,
      invalidates: { geometry_structure: true, uv_mapping: true, texture_appearance: true, animation_motion: true },
    };
  } catch (error) {
    try { await adapter.restore(before); } finally { await adapter.cancelUndo?.(); }
    throw error;
  }
}
