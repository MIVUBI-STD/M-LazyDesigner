/// <reference types="blockbench-types" />

import type { CompiledCubePlacement } from "@/lib/authoringRecipe/contracts";
import type { AuthoringRecipeApplyAdapter } from "@/lib/authoringRecipe/transaction";
import type { AuthoringRecipeNativeSnapshot } from "@/lib/authoringRecipe/nativeState";
import {
  authoringRecipeOwnershipPatch,
  readAuthoringRecipeCubeOwnership,
} from "@/server/runtime/authoringRecipeOwnership";

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
      Undo.initEdit({
        elements: existing,
        outliner: true,
        collections: [],
      });
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
    commitUndo: () => {
      Undo.finishEdit("LazyDesigner parametric recipe", {
        elements: created,
      });
      created = [];
      Canvas.updateAll();
    },
    cancelUndo: () => {
      if (Undo.current_save) Undo.cancelEdit(true);
      created = [];
      Canvas.updateAll();
    },
  };
}
