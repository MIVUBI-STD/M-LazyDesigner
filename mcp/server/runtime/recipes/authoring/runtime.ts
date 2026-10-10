/// <reference types="blockbench-types" />

import type { CompiledCubePlacement } from "@/lib/authoringRecipe/contracts";
import type { AuthoringRecipeApplyAdapter } from "@/lib/authoringRecipe/transaction";
import type { AuthoringRecipeNativeSnapshot } from "@/lib/authoringRecipe/nativeState";
import {
  authoringRecipeOwnershipPatch,
  readAuthoringRecipeCubeOwnership,
} from "./ownership";

function requireProject(): void {
  if (!Project) throw new Error("Parametric recipe apply requires an open Blockbench project.");
}

function recipeOwnedCubes(recipeId: string): Cube[] {
  requireProject();
  const owned: Cube[] = [];
  const seen = new Set<string>();
  for (const cube of Cube.all ?? []) {
    const ownership = readAuthoringRecipeCubeOwnership(cube);
    if (!ownership || ownership.recipe_id !== recipeId) continue;
    if (seen.has(ownership.instance_id)) {
      throw new Error("Duplicate parametric recipe ownership for instance " + ownership.instance_id + ".");
    }
    seen.add(ownership.instance_id);
    owned.push(cube);
  }
  return owned;
}

function cubeState(cube: Cube, recipeId: string) {
  const ownership = readAuthoringRecipeCubeOwnership(cube);
  if (!ownership || ownership.recipe_id !== recipeId) {
    throw new Error("Cube " + cube.uuid + " is not owned by recipe " + recipeId + ".");
  }
  return {
    uuid: cube.uuid,
    recipe_id: ownership.recipe_id,
    instance_id: ownership.instance_id,
    name: cube.name,
    from: [...cube.from] as [number,number,number],
    to: [...cube.to] as [number,number,number],
    origin: [...cube.origin] as [number,number,number],
    rotation: [...cube.rotation] as [number,number,number],
    inflate: cube.inflate ?? 0,
  };
}

export function readBlockbenchAuthoringRecipeOwnedState(recipeId: string): AuthoringRecipeNativeSnapshot {
  return {
    schema: 1,
    recipe_id: recipeId,
    cubes: recipeOwnedCubes(recipeId)
      .map((cube) => cubeState(cube,recipeId))
      .sort((a,b) => a.instance_id.localeCompare(b.instance_id)),
  };
}

function resolveOwnedCube(recipeId: string, instanceId: string, uuid: string): Cube {
  const cube = (Cube.all ?? []).find((candidate: Cube) => candidate.uuid === uuid);
  if (!cube) throw new Error("Recipe-owned Cube UUID " + uuid + " is missing.");
  const ownership = readAuthoringRecipeCubeOwnership(cube);
  if (!ownership || ownership.recipe_id !== recipeId || ownership.instance_id !== instanceId) {
    throw new Error("Recipe-owned Cube identity changed for " + instanceId + ".");
  }
  return cube;
}

function extendPlacement(cube: Cube, placement: CompiledCubePlacement, recipeId: string): void {
  cube.extend({
    name: placement.name,
    from: [...placement.from] as [number,number,number],
    to: [...placement.to] as [number,number,number],
    origin: [...placement.origin] as [number,number,number],
    rotation: [...placement.rotation] as [number,number,number],
    inflate: placement.inflate,
    ...authoringRecipeOwnershipPatch({ recipe_id: recipeId, instance_id: placement.id }),
  } as any);
}

export function createBlockbenchAuthoringRecipeApplyAdapter(recipeId: string): AuthoringRecipeApplyAdapter {
  let created: Cube[] = [];
  let existingAtBegin: Cube[] = [];
  let activeUndoSave: unknown | null = null;
  let undoIndexAtBegin: number | null = null;
  const requireOwnedUndo = () => {
    if (!activeUndoSave || Undo.current_save !== activeUndoSave ||
        undoIndexAtBegin === null || Undo.index !== undoIndexAtBegin) {
      throw new Error(
        "RECIPE_NATIVE_UNDO_OWNERSHIP_LOST: another editor operation changed the active Undo transaction."
      );
    }
  };
  return {
    readOwned: (requestedRecipeId) => {
      if (requestedRecipeId !== recipeId) throw new Error("Parametric recipe adapter recipe identity mismatch.");
      return readBlockbenchAuthoringRecipeOwnedState(recipeId);
    },
    beginUndo: (affectedInstanceIds) => {
      if (Undo.current_save) throw new Error("Finish the current Blockbench edit before applying a parametric recipe.");
      created = [];
      const affected = new Set(affectedInstanceIds);
      const existing = recipeOwnedCubes(recipeId).filter((cube) => {
        const ownership = readAuthoringRecipeCubeOwnership(cube)!;
        return affected.has(ownership.instance_id);
      });
      existingAtBegin = existing;
      const undoIndex = Undo.index;
      Undo.initEdit({
        elements: existing,
        outliner: true,
        collections: [],
      });
      activeUndoSave = Undo.current_save ?? null;
      undoIndexAtBegin = undoIndex;
      requireOwnedUndo();
    },
    upsert: (placement, existingUuid, requestedRecipeId) => {
      if (requestedRecipeId !== recipeId) throw new Error("Parametric recipe upsert identity mismatch.");
      if (existingUuid) {
        const cube = resolveOwnedCube(recipeId, placement.id, existingUuid);
        extendPlacement(cube,placement,recipeId);
        return cube.uuid;
      }
      if (recipeOwnedCubes(recipeId).some((cube) => readAuthoringRecipeCubeOwnership(cube)?.instance_id === placement.id)) {
        throw new Error("Parametric recipe create target already exists: " + placement.id + ".");
      }
      const cube = new Cube({
        autouv: 1,
        name: placement.name,
        from: [...placement.from] as [number,number,number],
        to: [...placement.to] as [number,number,number],
        origin: [...placement.origin] as [number,number,number],
        rotation: [...placement.rotation] as [number,number,number],
        inflate: placement.inflate,
      }).init();
      cube.addTo("root");
      extendPlacement(cube,placement,recipeId);
      cube.mapAutoUV();
      created.push(cube);
      return cube.uuid;
    },
    remove: (instanceId, uuid, requestedRecipeId) => {
      if (requestedRecipeId !== recipeId) throw new Error("Parametric recipe removal identity mismatch.");
      resolveOwnedCube(recipeId,instanceId,uuid).remove();
    },
    verifyBeforeCommit: ({ affectedInstanceIds }) => {
      requireOwnedUndo();
      // Verify all newly authored cubes still exist and carry exact recipe
      // ownership. This does not substitute for reference-image visual QA.
      const affected = new Set(affectedInstanceIds);
      for (const cube of created) {
        if (!(Cube.all ?? []).includes(cube)) {
          throw new Error("RECIPE_NATIVE_PRECOMMIT_MISSING_CUBE: " + cube.uuid);
        }
        const owner = readAuthoringRecipeCubeOwnership(cube);
        if (!owner || owner.recipe_id !== recipeId ||
            !affected.has(owner.instance_id)) {
          throw new Error("RECIPE_NATIVE_PRECOMMIT_OWNERSHIP_MISMATCH: " + cube.uuid);
        }
      }
    },
    commitUndo: () => {
      requireOwnedUndo();
      // Update dependent rendered state *before* committing the native edit.
      // After finishEdit succeeds we must not risk another throwing operation.
      Canvas.updateAll();
      // UndoSystem.save.load() removes elements present in the opposite
      // snapshot but not this one. Include surviving updated Cubes and new
      // Cubes in the post-save; omit deleted Cubes so redo removes them.
      // Outliner is recorded in both directions for create/remove ordering.
      const surviving = existingAtBegin.filter((cube) =>
        (Cube.all ?? []).includes(cube)
      );
      Undo.finishEdit("LazyDesigner parametric recipe", {
        elements: [...surviving, ...created],
        outliner: true,
        collections: [],
      });
      activeUndoSave = null;
      undoIndexAtBegin = null;
      created = [];
      existingAtBegin = [];
    },
    cancelUndo: () => {
      // Native Blockbench 5.2 cancelEdit(true) replays this transaction's
      // before-save. Do NOT cancel another tool's active edit.
      requireOwnedUndo();
      Undo.cancelEdit(true);
      activeUndoSave = null;
      undoIndexAtBegin = null;
      created = [];
      existingAtBegin = [];
      Canvas.updateAll();
    },
  };
}
