/// <reference types="blockbench-types" />

import { createAuthoringRecipeService } from "@/lib/authoringRecipe/service";
import {
  assertAuthoringRecipeNativeMatchesCompiled,
  fingerprintAuthoringRecipeNativeSnapshot,
} from "@/lib/authoringRecipe/nativeState";
import { resolveSemanticIdentity } from "@/lib/authoringRecipe/semanticIdentity";
import {
  findAuthoringRecipeInStore,
  parseAuthoringRecipeStore,
} from "@/lib/authoringRecipe/store";
import { readBlockbenchAuthoringRecipeOwnedState, createBlockbenchAuthoringRecipeApplyAdapter } from "./runtime";
import {
  readAuthoringRecipeStoreProperty,
} from "./ownership";

export function createBlockbenchAuthoringRecipeService() {
  return createAuthoringRecipeService({
    readOwned: readBlockbenchAuthoringRecipeOwnedState,
    readStoredRecipe: (recipeId) => {
      if (!Project) {
        throw new Error(
          "Stored recipe planning requires an open Blockbench project."
        );
      }
      const store = parseAuthoringRecipeStore(
        readAuthoringRecipeStoreProperty(Project)
      );
      return findAuthoringRecipeInStore(store, recipeId);
    },
    createApplyAdapter: createBlockbenchAuthoringRecipeApplyAdapter,
  });
}

/**
 * Canonical native evidence for opt-in recipe-owned correspondence captures.
 * The caller supplies exact UUIDs, never element names or inferred part IDs.
 * This reads native-owned state and saved recipe from the same current project.
 * It does not store evidence or promise that unrelated model/texture geometry
 * is unchanged.
 */
export function readRecipePartCaptureScope(
  recipeId: string,
  requestedCubeUuids: readonly string[]
) {
  if (!Project || !Project.uuid) {
    throw new Error("PART_CORRESPONDENCE_PROJECT_REQUIRED");
  }
  if (!recipeId.trim() ||
      requestedCubeUuids.length > 64 ||
      new Set(requestedCubeUuids).size !== requestedCubeUuids.length) {
    throw new Error("PART_CORRESPONDENCE_TARGET_SCOPE_INVALID");
  }
  const projectUuid = Project.uuid;
  const store = parseAuthoringRecipeStore(
    readAuthoringRecipeStoreProperty(Project)
  );
  const recipe = findAuthoringRecipeInStore(store, recipeId);
  if (!recipe) {
    throw new Error("PART_CORRESPONDENCE_RECIPE_NOT_STORED: only saved recipe-owned Cubes can be attested.");
  }
  const native = readBlockbenchAuthoringRecipeOwnedState(recipeId);
  assertAuthoringRecipeNativeMatchesCompiled(native, recipe);
  const requested = new Set(requestedCubeUuids);
  const matched = native.cubes.filter((cube) => requested.has(cube.uuid));
  const resolution = matched.length
    ? resolveSemanticIdentity(recipe, native, {
        instance_ids: matched.map((cube) => cube.instance_id),
      })
    : {
        recipe_id: recipeId,
        selected_by: "INSTANCE_IDS" as const,
        count: 0,
        identities: [],
      };
  return {
    project_uuid: projectUuid,
    recipe_id: recipeId,
    native_snapshot_fingerprint: fingerprintAuthoringRecipeNativeSnapshot(native),
    identities: resolution,
    native_scope: "RECIPE_OWNED_CUBES_ONLY" as const,
    requested_count: requestedCubeUuids.length,
    verified_count: matched.length,
  };
}
