import { describe, expect, test } from "bun:test";
import { nativeUvSnapshotFingerprint, snapshotToNativeUvTargets } from "@/lib/uv/nativeState";

const faces = {
  north: { uv: [0,0,4,4] as const, rotation: 0 },
  south: { uv: [4,0,8,4] as const, rotation: 0 },
  east: { uv: [8,0,12,4] as const, rotation: 0 },
  west: { uv: [12,0,16,4] as const, rotation: 0 },
  up: { uv: [0,4,4,8] as const, rotation: 0 },
  down: { uv: [4,4,8,8] as const, rotation: 0 },
};

describe("native UV state", () => {
  test("has deterministic fingerprints and exact target identities", () => {
    const snapshot = { cube_uuid: "cube", box_uv: false, autouv: 0, faces };
    expect(nativeUvSnapshotFingerprint([snapshot])).toBe(nativeUvSnapshotFingerprint([snapshot]));
    expect(snapshotToNativeUvTargets(snapshot).map((target) => target.island_id)).toEqual([
      "cube:north","cube:south","cube:east","cube:west","cube:up","cube:down"
    ]);
  });
});
