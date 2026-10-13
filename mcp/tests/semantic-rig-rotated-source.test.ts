import { describe, expect, test } from "bun:test";
import { compileSemanticRig, placementAnchor } from "@/lib/rig/semanticRig";
import type { CompiledAuthoringRecipe, CompiledCubePlacement } from "@/lib/authoringRecipe/contracts";

function cube(rotation: [number, number, number], overrides: Partial<CompiledCubePlacement> = {}): CompiledCubePlacement {
  return {
    id: "arm", name: "arm", prototype_id: "p",
    from: [0, 0, 0], to: [2, 2, 2], origin: [1, 1, 1],
    rotation, inflate: 0, source_pattern_id: "p", instance_index: 0,
    ...overrides,
  };
}

function closeVec(actual: readonly number[], expected: readonly number[]) {
  expect(actual).toHaveLength(3);
  for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(expected[i]!, 10);
}

describe("semantic rig rotated source geometry", () => {
  test("keeps unchanged geometry anchors for unrotated Cube", () => {
    expect(placementAnchor(cube([0, 0, 0]), ["MAX", "CENTER", "MIN"]))
      .toEqual([2, 1, 0]);
  });

  test("X rotation maps a local top-face anchor about the Cube origin", () => {
    closeVec(placementAnchor(cube([90, 0, 0]), ["CENTER", "MAX", "CENTER"]), [1, 1, 2]);
    closeVec(placementAnchor(cube([-90, 0, 0]), ["CENTER", "MAX", "CENTER"]), [1, 1, 0]);
  });

  test("Y rotation maps an edge anchor using Blockbench's positive-axis orientation", () => {
    closeVec(placementAnchor(cube([0, 90, 0]), ["MAX", "CENTER", "CENTER"]), [1, 1, 0]);
    closeVec(placementAnchor(cube([0, -90, 0]), ["MAX", "CENTER", "CENTER"]), [1, 1, 2]);
  });

  test("Z rotation maps an edge anchor without swapping the source Cube extents", () => {
    closeVec(placementAnchor(cube([0, 0, 90]), ["MAX", "CENTER", "CENTER"]), [1, 2, 1]);
  });

  test("45-degree Y rotation handles off-center pivots without rounding invented coordinates", () => {
    const door = cube([0, 45, 0], {
      from: [0, 0, 0], to: [4, 8, 1], origin: [0, 4, 0.5],
    });
    const result = placementAnchor(door, ["MAX", "CENTER", "CENTER"]);
    closeVec(result, [Math.SQRT2 * 2, 4, 0.5 - Math.SQRT2 * 2]);
    closeVec(placementAnchor(door, ["MIN", "CENTER", "CENTER"]), [0, 4, 0.5]);
  });

  test("rotated anchor propagates into JOINT and CHAIN plans without mutating Recipe", () => {
    const primary = cube([0, 90, 0], { from: [0, 0, 0], to: [2, 2, 2], origin: [0, 0, 0] });
    const secondary = cube([0, 0, 0], { id: "next", name: "next", from: [4, 0, 0], to: [6, 2, 2], origin: [0, 0, 0] });
    const compiled: CompiledAuthoringRecipe = {
      schema: 1, compiler_version: 1, recipe_id: "rotated",
      placements: [primary, secondary], symmetry_relationships: [],
      metrics: { prototype_count: 1, pattern_count: 1, instance_count: 2,
        realized_cube_count: 2, unique_geometry_count: 1, repeated_instance_count: 1, symmetry_generated_count: 0 },
    };
    const before = JSON.stringify(compiled);
    const joint = compileSemanticRig(compiled, [
      { kind: "JOINT", id: "end", name: "end", instance_id: "arm", anchor: ["MAX", "CENTER", "CENTER"] },
    ]);
    closeVec(joint.bones[0]!.origin, [1, 1, -2]);
    const chain = compileSemanticRig(compiled, [
      { kind: "CHAIN", id: "chain", name_prefix: "chain", instance_ids: ["arm", "next"] },
    ]);
    closeVec(chain.bones[0]!.origin, [1, 1, -1]);
    closeVec(chain.bones[1]!.origin, [5, 1, 1]);
    expect(JSON.stringify(compiled)).toBe(before);
  });

  test("mixed Euler rotations still fail closed pending format-specific evidence", () => {
    expect(() => placementAnchor(cube([45, 45, 0]), ["MAX", "CENTER", "CENTER"]))
      .toThrow("multi-axis Euler order");
  });

  test("invalid numbers and malformed anchors do not create native pivot candidates", () => {
    expect(() => placementAnchor(cube([Number.NaN, 0, 0]), ["CENTER", "CENTER", "CENTER"]))
      .toThrow("finite");
    expect(() => placementAnchor(cube([0, 0, 0], { origin: [Infinity, 0, 0] }),
      ["CENTER", "CENTER", "CENTER"])).toThrow("finite");
    expect(() => placementAnchor(cube([0, 0, 0]), ["INVALID" as any, "CENTER", "CENTER"]))
      .toThrow("anchor");
  });

  test("rotation overflow rejects non-finite output without inventing geometry", () => {
    expect(() => placementAnchor(cube([0, 1e308, 0]), ["MAX", "CENTER", "CENTER"]))
      .toThrow("finite transform range");
  });
});
