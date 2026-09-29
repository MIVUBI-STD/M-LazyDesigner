/// <reference types="blockbench-types" />

import { createAuthoringRecipeService } from "@/lib/authoringRecipe/service";
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
