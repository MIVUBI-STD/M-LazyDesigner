/// <reference types="blockbench-types" />

import { createAuthoringRecipeService } from "@/lib/authoringRecipe/service";
import { readBlockbenchAuthoringRecipeOwnedState, createBlockbenchAuthoringRecipeApplyAdapter } from "@/server/runtime/authoringRecipeRuntime";

export function createBlockbenchAuthoringRecipeService() {
  return createAuthoringRecipeService({
    readOwned: readBlockbenchAuthoringRecipeOwnedState,
    createApplyAdapter: createBlockbenchAuthoringRecipeApplyAdapter,
  });
}
