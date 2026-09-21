import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import { compileAuthoringRecipe } from "@/lib/authoringRecipe/compiler";
import { compareParametricEfficiency } from "@/lib/authoringRecipe/efficiency";
import { planIncrementalRecipeRebuild } from "@/lib/authoringRecipe/incremental";

export function parametricBenchmarkFixtures(): Array<{ name: string; recipe: AuthoringRecipe }> {
  return [
    { name: "shelf_24_boards", recipe: { schema: 1, compiler_version: 1, id: "fixture:shelf", name: "Shelf", prototypes: [{ id: "board", name: "shelf_board", size: [16,1,4], semantic_group: "SHELF" }], patterns: [{ kind: "LINEAR", id: "shelves", prototype_id: "board", count: 24, axis: "Y", spacing: 2 }] } },
    { name: "panel_grid_10x10", recipe: { schema: 1, compiler_version: 1, id: "fixture:grid", name: "Panel Grid", prototypes: [{ id: "panel", name: "panel", size: [2,2,1], semantic_group: "PANEL" }], patterns: [{ kind: "GRID", id: "grid", prototype_id: "panel", counts: [10,10], axes: ["X","Y"], spacing: [3,3] }] } },
    { name: "radial_64_spokes", recipe: { schema: 1, compiler_version: 1, id: "fixture:wheel", name: "Wheel", prototypes: [{ id: "spoke", name: "spoke", size: [1,1,6], semantic_group: "SPOKE" }], patterns: [{ kind: "RADIAL", id: "spokes", prototype_id: "spoke", count: 64, axis: "Z", radius: 8, rotate_with_pattern: true }] } },
  ];
}

export function runParametricEfficiencyBenchmark() {
  return parametricBenchmarkFixtures().map((fixture) => {
    const first = compileAuthoringRecipe(fixture.recipe);
    const second = compileAuthoringRecipe(fixture.recipe);
    if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error("Parametric fixture " + fixture.name + " is non-deterministic.");
    return { fixture: fixture.name, ...compareParametricEfficiency(fixture.recipe, first) };
  });
}

export function runIncrementalRebuildBenchmark() {
  const previous: AuthoringRecipe = {
    schema: 1,
    compiler_version: 1,
    id: "fixture:incremental-grid",
    name: "Incremental Grid",
    prototypes: [{ id: "panel", name: "panel", size: [2,2,1] }],
    patterns: [
      { kind: "GRID", id: "left", prototype_id: "panel", counts: [10,10], axes: ["X","Y"], spacing: [3,3], start: [0,0,0] },
      { kind: "GRID", id: "right", prototype_id: "panel", counts: [10,10], axes: ["X","Y"], spacing: [3,3], start: [40,0,0] },
    ],
  };
  const next = structuredClone(previous);
  const left = next.patterns.find((pattern) => pattern.id === "left");
  if (!left || left.kind !== "GRID") throw new Error("incremental fixture corrupted");
  left.spacing = [3.25, 3];
  const plan = planIncrementalRecipeRebuild(previous, next);
  return {
    total_next_cubes: plan.metrics.next_cube_count,
    affected_cubes: plan.metrics.affected_count,
    preserved_cubes: plan.metrics.preserved_count,
    affected_ratio: plan.metrics.affected_ratio_of_next,
  };
}

export function assertParametricEfficiencyGuard() {
  const results = runParametricEfficiencyBenchmark();
  for (const result of results) {
    if (!result.quality_contract.deterministic) {
      throw new Error(result.fixture + ": compilation is not deterministic.");
    }
    if (!result.quality_contract.finite_geometry) {
      throw new Error(result.fixture + ": compiled geometry is not finite.");
    }
    if (
      result.quality_contract.compiled_cube_count !==
      result.quality_contract.expected_cube_count
    ) {
      throw new Error(result.fixture + ": compiled Cube count changed.");
    }
    if (result.savings.payload_ratio <= 0.25) {
      throw new Error(
        result.fixture +
          ": recipe payload savings fell to " +
          (result.savings.payload_ratio * 100).toFixed(2) +
          "%; expected >25%."
      );
    }
    if (
      result.quality_contract.compiled_cube_count > 32 &&
      result.savings.manage_cubes_calls <= 0
    ) {
      throw new Error(
        result.fixture +
          ": large repeated output no longer reduces the static mutation-batch proxy."
      );
    }
  }
  const incremental = runIncrementalRebuildBenchmark();
  if (incremental.total_next_cubes !== 200) {
    throw new Error("Incremental fixture Cube count changed.");
  }
  if (incremental.affected_ratio >= 0.5) {
    throw new Error(
      "Incremental isolated change touches " +
        (incremental.affected_ratio * 100).toFixed(2) +
        "% of output; expected less than 50%."
    );
  }
  return { repeated: results, incremental };
}

if (import.meta.main) {
  console.log(
    JSON.stringify(assertParametricEfficiencyGuard(), null, 2)
  );
}
