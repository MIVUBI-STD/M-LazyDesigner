import type { CubeFaceKey } from "@/lib/uv/authoringRecipeUv";
import type { NativeUvTarget } from "@/lib/uv/nativeApplyPlan";

export type NativeUvCubeSnapshot = {
  cube_uuid: string;
  box_uv: boolean;
  autouv: number;
  faces: Readonly<Record<CubeFaceKey, {
    uv: readonly [number, number, number, number];
    rotation: number;
  }>>;
};

const FACE_KEYS: readonly CubeFaceKey[] = ["north", "south", "east", "west", "up", "down"];

function finiteUv(values: readonly number[], label: string): [number, number, number, number] {
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    throw new Error(label + " requires four finite UV values.");
  }
  return [values[0], values[1], values[2], values[3]];
}

export function snapshotToNativeUvTargets(snapshot: NativeUvCubeSnapshot): NativeUvTarget[] {
  return FACE_KEYS.map((face) => ({
    island_id: snapshot.cube_uuid + ":" + face,
    cube_uuid: snapshot.cube_uuid,
    face,
    current_uv: finiteUv(snapshot.faces[face].uv, snapshot.cube_uuid + ":" + face),
    current_rotation: snapshot.faces[face].rotation,
  }));
}

export function nativeUvSnapshotFingerprint(snapshots: readonly NativeUvCubeSnapshot[]): string {
  return JSON.stringify(
    [...snapshots]
      .sort((a, b) => a.cube_uuid.localeCompare(b.cube_uuid))
      .map((snapshot) => ({
        cube_uuid: snapshot.cube_uuid,
        box_uv: snapshot.box_uv,
        autouv: snapshot.autouv,
        faces: Object.fromEntries(
          FACE_KEYS.map((face) => [
            face,
            {
              uv: [...snapshot.faces[face].uv],
              rotation: snapshot.faces[face].rotation,
            },
          ])
        ),
      }))
  );
}
