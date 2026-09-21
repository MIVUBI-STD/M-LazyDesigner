import { describe, expect, test } from "bun:test";
import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import { compileAuthoringRecipe } from "@/lib/authoringRecipe/compiler";
import { expandRecipePattern } from "@/lib/authoringRecipe/patterns";
import { runParametricEfficiencyBenchmark } from "@/scripts/benchmark-parametric-authoring";

describe("Parametric Authoring Engine G0-G2", () => {
  test("linear/grid/radial patterns expand deterministically", () => {
    expect(expandRecipePattern({ kind: "LINEAR", id: "line", prototype_id: "cube", count: 3, axis: "X", spacing: 2 }).map((instance) => instance.translation)).toEqual([[0,0,0],[2,0,0],[4,0,0]]);
    expect(expandRecipePattern({ kind: "GRID", id: "grid", prototype_id: "cube", counts: [2,2], axes: ["X","Y"], spacing: [3,5] }).map((instance) => instance.translation)).toEqual([[0,0,0],[0,5,0],[3,0,0],[3,5,0]]);
    const radial = expandRecipePattern({ kind: "RADIAL", id: "radial", prototype_id: "cube", count: 4, axis: "Z", radius: 2, rotate_with_pattern: true });
    expect(radial).toHaveLength(4);
    expect(radial[0].translation).toEqual([2,0,0]);
    expect(radial[1].rotation).toEqual([0,0,90]);
  });

  test("compiler realizes repeated recipe into exact bounded cube placements", () => {
    const recipe: AuthoringRecipe = { schema: 1, compiler_version: 1, id: "fixture", name: "fixture", prototypes: [{ id: "board", name: "board", size: [8,1,4] }], patterns: [{ kind: "LINEAR", id: "shelves", prototype_id: "board", count: 3, axis: "Y", spacing: 4 }] };
    const compiled = compileAuthoringRecipe(recipe);
    expect(compiled.placements).toHaveLength(3);
    expect(compiled.placements[2]).toMatchObject({ from: [0,8,0], to: [8,9,4], source_pattern_id: "shelves" });
    expect(compiled.metrics).toMatchObject({ prototype_count: 1, pattern_count: 1, instance_count: 3, unique_geometry_count: 1, repeated_instance_count: 2 });
  });

  test("invalid recipe structure fails closed before native mutation", () => {
    expect(() => compileAuthoringRecipe({ schema: 1, compiler_version: 1, id: "bad", name: "bad", prototypes: [{ id: "cube", name: "cube", size: [0,1,1] }], patterns: [] })).toThrow(/size must be positive/);
    expect(() => expandRecipePattern({ kind: "GRID", id: "bad-grid", prototype_id: "cube", counts: [2,2], axes: ["X","X"], spacing: [1,1] })).toThrow(/axes must be distinct/);
  });

  test("repeated-structure benchmark proves static savings without wall-clock claims", () => {
    const results = runParametricEfficiencyBenchmark();
    expect(results).toHaveLength(3);
    for (const result of results) {
      expect(result.wall_clock_claim).toBe("not_measured");
      expect(result.quality_contract.deterministic).toBe(true);
      expect(result.quality_contract.finite_geometry).toBe(true);
      expect(result.quality_contract.compiled_cube_count).toBe(result.quality_contract.expected_cube_count);
      expect(result.savings.payload_bytes).toBeGreaterThan(0);
      expect(result.savings.payload_ratio).toBeGreaterThan(0.25);
    }
    const large = results.filter((result) => result.quality_contract.compiled_cube_count > 32);
    expect(large.length).toBeGreaterThan(0);
    expect(large.every((result) => result.savings.manage_cubes_calls > 0)).toBe(true);
  });
});
