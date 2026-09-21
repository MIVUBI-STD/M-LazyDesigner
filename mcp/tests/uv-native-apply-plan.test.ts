import { describe, expect, test } from "bun:test";
import { compileNativeUvApplyPlan } from "@/lib/uv/nativeApplyPlan";

describe("native UV apply plan", () => {
  test("compiles semantic placements without mutating Blockbench", () => {
    const result = compileNativeUvApplyPlan([
      { id: "cube:north", source_id: "cube:north", x: 2, y: 3, width: 4, height: 6, rotated: false, cohort: "base", locked: false },
    ], [
      { island_id: "cube:north", cube_uuid: "cube-uuid", face: "north", current_uv: [0,0,1,1], current_rotation: 0 },
    ]);
    expect(result.complete).toBe(true);
    expect(result.operations[0]).toEqual({
      island_id: "cube:north",
      cube_uuid: "cube-uuid",
      face: "north",
      uv: [2,3,6,9],
      rotation: 0,
      shared_with: undefined,
    });
  });
});
