import { expect, test } from "bun:test";
import { analyzeAxisAlignedSurfaceEvidence } from "@/lib/geometrySurfaceEvidence";

const cube = (uuid: string, from: number[], to: number[], rotation = [0, 0, 0]) => ({
  uuid,
  name: uuid,
  from,
  to,
  rotation,
  inflate: 0,
});

test("same-facing coplanar layers block while butt joints do not", () => {
  const layered = analyzeAxisAlignedSurfaceEvidence([
    cube("a", [0, 0, 0], [4, 4, 4]),
    cube("b", [0, 0, 0], [4, 4, 2]),
  ]);
  expect(layered.coplanar_overlap_count).toBeGreaterThan(0);
  expect(layered.state).toBe("blocked");

  const butt = analyzeAxisAlignedSurfaceEvidence([
    cube("left", [0, 0, 0], [4, 4, 4]),
    cube("right", [4, 0, 0], [8, 4, 4]),
  ]);
  expect(butt.coplanar_overlap_count).toBe(0);
  expect(butt.positive_volume_intersection_count).toBe(0);
  expect(butt.state).toBe("clean");
});

test("positive volume overlap is evidence but not automatically a texture blocker", () => {
  const result = analyzeAxisAlignedSurfaceEvidence([
    cube("outer", [0, 0, 0], [6, 6, 6]),
    cube("inner", [2, 2, 2], [4, 4, 4]),
  ]);
  expect(result.positive_volume_intersection_count).toBe(1);
  expect(result.coplanar_overlap_count).toBe(0);
  expect(result.state).toBe("clean");
});

test("unsupported transforms remain partial rather than false-clean", () => {
  const result = analyzeAxisAlignedSurfaceEvidence([
    cube("rotated", [0, 0, 0], [4, 4, 4], [0, 45, 0]),
  ]);
  expect(result.complete).toBe(false);
  expect(result.excluded_rotated_cube_count).toBe(1);
  expect(result.state).toBe("partial");
});
