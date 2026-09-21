/// <reference types="blockbench-types" />

import type { CubeFaceKey } from "@/lib/uv/authoringRecipeUv";
import type { NativeUvApplyOperation, NativeUvTarget } from "@/lib/uv/nativeApplyPlan";
import { requireSemanticUvAutomationAllowed } from "@/lib/uv/boxUvPolicy";
import {
  nativeUvSnapshotFingerprint,
  type NativeUvCubeSnapshot,
} from "@/lib/uv/nativeState";
import {
  validateNativeUvTransactionPlan,
  type NativeUvTransactionPlan,
  type NativeUvTransactionReceipt,
} from "@/lib/uv/nativeTransaction";
import { readAuthoringRecipeCubeOwnership } from "@/server/runtime/authoringRecipeOwnership";

const FACE_KEYS: readonly CubeFaceKey[] = ["north", "south", "east", "west", "up", "down"];

function requireProject(): void {
  if (!Project) throw new Error("Semantic UV runtime requires an open Blockbench project.");
}

function resolveCube(uuid: string): Cube {
  const cube = (Cube.all ?? []).find((candidate: Cube) => candidate.uuid === uuid);
  if (!cube) throw new Error("Semantic UV target Cube is missing: " + uuid + ".");
  return cube;
}

function faceUv(face: CubeFace, label: string): [number, number, number, number] {
  const uv = [...face.uv];
  if (uv.length !== 4 || uv.some((value) => !Number.isFinite(value))) {
    throw new Error(label + " has invalid native UV state.");
  }
  return [uv[0], uv[1], uv[2], uv[3]];
}

export function readBlockbenchSemanticUvSnapshot(cubeUuids?: readonly string[]): NativeUvCubeSnapshot[] {
  requireProject();
  const requested = cubeUuids ? new Set(cubeUuids) : null;
  if (requested && requested.size !== cubeUuids!.length) throw new Error("Semantic UV snapshot Cube UUIDs must be unique.");
  const cubes = requested
    ? [...requested].map(resolveCube)
    : [...(Cube.all ?? [])];

  return cubes.map((cube) => ({
    cube_uuid: cube.uuid,
    box_uv: cube.box_uv === true,
    autouv: cube.autouv,
    faces: Object.fromEntries(
      FACE_KEYS.map((face) => [
        face,
        {
          uv: faceUv(cube.faces[face], cube.uuid + ":" + face),
          rotation: cube.faces[face].rotation,
        },
      ])
    ) as NativeUvCubeSnapshot["faces"],
  })).sort((a, b) => a.cube_uuid.localeCompare(b.cube_uuid));
}

export function readBlockbenchAuthoringRecipeUvTargets(recipeId: string) {
  requireProject();
  if (!recipeId.trim()) throw new Error("Authoring Recipe UV target read requires recipe identity.");
  const targets: NativeUvTarget[] = [];
  const snapshots: NativeUvCubeSnapshot[] = [];
  const blocked_box_uv: string[] = [];
  const seenInstances = new Set<string>();

  for (const cube of Cube.all ?? []) {
    const ownership = readAuthoringRecipeCubeOwnership(cube);
    if (!ownership || ownership.recipe_id !== recipeId) continue;
    if (seenInstances.has(ownership.instance_id)) {
      throw new Error("Duplicate native Cube ownership for recipe instance " + ownership.instance_id + ".");
    }
    seenInstances.add(ownership.instance_id);
    const snapshot = readBlockbenchSemanticUvSnapshot([cube.uuid])[0];
    snapshots.push(snapshot);
    if (snapshot.box_uv) {
      blocked_box_uv.push(cube.uuid);
      continue;
    }
    for (const face of FACE_KEYS) {
      targets.push({
        island_id: ownership.instance_id + ":" + face,
        cube_uuid: cube.uuid,
        face,
        current_uv: snapshot.faces[face].uv,
        current_rotation: snapshot.faces[face].rotation,
      });
    }
  }

  snapshots.sort((a, b) => a.cube_uuid.localeCompare(b.cube_uuid));
  targets.sort((a, b) => a.island_id.localeCompare(b.island_id));
  blocked_box_uv.sort();
  return {
    snapshots,
    fingerprint: nativeUvSnapshotFingerprint(snapshots),
    targets,
    blocked_box_uv,
  };
}

function validateLogicalUvBounds(operation: NativeUvApplyOperation): void {
  const width = Project?.texture_width;
  const height = Project?.texture_height;
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error("Semantic UV apply requires finite positive project logical UV dimensions.");
  }
  if (operation.uv.some((value) => !Number.isInteger(value))) {
    throw new Error("Semantic UV apply requires integer logical UV coordinates for pixel-grid stability: " + operation.island_id + ".");
  }
  const minU = Math.min(operation.uv[0], operation.uv[2]);
  const minV = Math.min(operation.uv[1], operation.uv[3]);
  const maxU = Math.max(operation.uv[0], operation.uv[2]);
  const maxV = Math.max(operation.uv[1], operation.uv[3]);
  if (minU < 0 || minV < 0 || maxU > width || maxV > height) {
    throw new Error("Semantic UV apply exceeds the logical atlas bounds for " + operation.island_id + ".");
  }
}

function operationChangesNativeState(cube: Cube, operation: NativeUvApplyOperation): boolean {
  const face = cube.faces[operation.face];
  return (
    face.rotation !== operation.rotation ||
    operation.uv.some((value, index) => value !== face.uv[index])
  );
}

export function applyBlockbenchSemanticUvTransaction(
  plan: NativeUvTransactionPlan
): NativeUvTransactionReceipt {
  requireProject();
  validateNativeUvTransactionPlan(plan);

  const cubeUuids = [...new Set(plan.operations.map((operation) => operation.cube_uuid))].sort();
  const beforeSnapshots = readBlockbenchSemanticUvSnapshot(cubeUuids);
  const beforeFingerprint = nativeUvSnapshotFingerprint(beforeSnapshots);
  if (beforeFingerprint !== plan.expected_fingerprint) {
    throw new Error("Semantic UV source state changed after planning. Re-read affected UV state and recompile the plan before mutation.");
  }

  const cubeByUuid = new Map(cubeUuids.map((uuid) => [uuid, resolveCube(uuid)]));
  for (const cube of cubeByUuid.values()) {
    requireSemanticUvAutomationAllowed(cube.box_uv === true, "Cube " + cube.name + " (" + cube.uuid + ")");
  }
  for (const operation of plan.operations) validateLogicalUvBounds(operation);

  const changedOperations = plan.operations.filter((operation) => {
    const cube = cubeByUuid.get(operation.cube_uuid)!;
    return operationChangesNativeState(cube, operation);
  });

  if (changedOperations.length === 0) {
    return {
      execution: "unchanged",
      affected_cube_uuids: [],
      affected_island_ids: [],
      operation_count: 0,
      before_fingerprint: beforeFingerprint,
      after_fingerprint: beforeFingerprint,
    };
  }

  if (Undo.current_save) {
    throw new Error("Finish the current Blockbench edit before applying a semantic UV transaction.");
  }

  const affectedCubeUuids = [...new Set(changedOperations.map((operation) => operation.cube_uuid))].sort();
  const affectedCubes = affectedCubeUuids.map((uuid) => cubeByUuid.get(uuid)!);
  Undo.initEdit({ elements: affectedCubes, outliner: false, collections: [] });
  let editOpen = true;
  try {
    for (const operation of changedOperations) {
      const cube = cubeByUuid.get(operation.cube_uuid)!;
      const face = cube.faces[operation.face];
      face.extend({
        uv: operation.uv,
        rotation: operation.rotation,
      });
      cube.extend({ box_uv: false, autouv: 0 });
    }
    Undo.finishEdit("LazyDesigner semantic UV layout");
    editOpen = false;
    Canvas.updateAll();
  } catch (error) {
    if (editOpen) Undo.cancelEdit(true);
    Canvas.updateAll();
    throw error;
  }

  const afterSnapshots = readBlockbenchSemanticUvSnapshot(cubeUuids);
  const afterFingerprint = nativeUvSnapshotFingerprint(afterSnapshots);
  return {
    execution: "applied",
    affected_cube_uuids: affectedCubeUuids,
    affected_island_ids: changedOperations.map((operation) => operation.island_id).sort(),
    operation_count: changedOperations.length,
    before_fingerprint: beforeFingerprint,
    after_fingerprint: afterFingerprint,
  };
}
