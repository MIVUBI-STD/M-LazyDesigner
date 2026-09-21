import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import { compileAuthoringRecipe } from "@/lib/authoringRecipe/compiler";
import { compareParametricEfficiency } from "@/lib/authoringRecipe/efficiency";

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

if (import.meta.main) console.log(JSON.stringify(runParametricEfficiencyBenchmark(), null, 2));
