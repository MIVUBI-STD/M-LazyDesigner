import { describe, expect, test } from "bun:test";
import type { RecipeComponentDefinition } from "@/lib/authoringRecipe/components";
import { composeAuthoringComponents } from "@/lib/authoringRecipe/components";
import { compileAuthoringRecipe } from "@/lib/authoringRecipe/compiler";

const wheel: RecipeComponentDefinition = {
  id: "wheel", name: "Wheel",
  recipe: {
    schema: 1, compiler_version: 1, id: "component:wheel", name: "Wheel",
    prototypes: [{ id: "spoke", name: "spoke", size: [1,1,4], semantic_group: "SPOKE" }],
    patterns: [{ kind: "RADIAL", id: "spokes", prototype_id: "spoke", count: 8, axis: "Z", radius: 4, rotate_with_pattern: true }],
  },
};

describe("Parametric Authoring G4 component composition", () => {
  test("reuses one local component recipe across translated instances with namespace-safe IDs", () => {
    const composed = composeAuthoringComponents(
      { schema: 1, compiler_version: 1, id: "vehicle", name: "Vehicle" },
      [wheel],
      [
        { id: "front_left", component_id: "wheel", translation: [-6,0,4] },
        { id: "front_right", component_id: "wheel", translation: [6,0,4] },
      ]
    );
    expect(composed.prototypes.map((item) => item.id)).toEqual(["front_left/spoke","front_right/spoke"]);
    expect(composed.patterns.map((item) => item.id)).toEqual(["front_left/spokes","front_right/spokes"]);
    const compiled = compileAuthoringRecipe(composed);
    expect(compiled.placements).toHaveLength(16);
    expect(compiled.placements.some((item) => item.id === "front_left/spokes:0")).toBe(true);
    expect(compiled.placements.some((item) => item.id === "front_right/spokes:0")).toBe(true);
  });

  test("pattern override parameterizes a component without rewriting its local recipe", () => {
    const composed = composeAuthoringComponents(
      { schema: 1, compiler_version: 1, id: "vehicle", name: "Vehicle" },
      [wheel],
      [{ id: "hero_wheel", component_id: "wheel", pattern_overrides: [{ pattern_id: "spokes", count: 12, radius: 6 }] }]
    );
    const compiled = compileAuthoringRecipe(composed);
    expect(compiled.placements).toHaveLength(12);
    const radial = composed.patterns[0];
    expect(radial.kind).toBe("RADIAL");
    if (radial.kind === "RADIAL") { expect(radial.count).toBe(12); expect(radial.radius).toBe(6); }
  });

  test("invalid cross-kind overrides and unknown patterns fail closed", () => {
    expect(() => composeAuthoringComponents(
      { schema: 1, compiler_version: 1, id: "bad", name: "Bad" }, [wheel],
      [{ id: "wheel_a", component_id: "wheel", pattern_overrides: [{ pattern_id: "spokes", counts: [2,2] }] }]
    )).toThrow(/RADIAL pattern override/);
    expect(() => composeAuthoringComponents(
      { schema: 1, compiler_version: 1, id: "bad", name: "Bad" }, [wheel],
      [{ id: "wheel_a", component_id: "wheel", pattern_overrides: [{ pattern_id: "missing", count: 5 }] }]
    )).toThrow(/unknown pattern/);
  });
});
