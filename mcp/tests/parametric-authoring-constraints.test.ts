import { describe, expect, test } from "bun:test";
import type { AuthoringRecipe, RecipeCubePrototype, RecipeInstance } from "@/lib/authoringRecipe/contracts";
import { compileAuthoringRecipe } from "@/lib/authoringRecipe/compiler";
import { solveRecipeConstraints } from "@/lib/authoringRecipe/constraints";

describe("Parametric Authoring G1 anchor constraints", () => {
  const prototypes = new Map<string, RecipeCubePrototype>([
    ["body", { id: "body", name: "body", size: [10,10,10] }],
    ["handle", { id: "handle", name: "handle", size: [2,4,2] }],
  ]);
  const instances: RecipeInstance[] = [
    { id: "body:0", prototype_id: "body", translation: [0,0,0], rotation: [0,0,0], scale: [1,1,1] },
    { id: "handle:0", prototype_id: "handle", translation: [0,0,0], rotation: [0,0,0], scale: [1,1,1] },
  ];

  test("anchor constraint expresses flush/center/offset without absolute source coordinates", () => {
    const solved = solveRecipeConstraints(instances, prototypes, [{
      kind: "ANCHOR", id: "attach-handle", source_instance_id: "handle:0", target_instance_id: "body:0",
      axes: ["X","Y","Z"], source_anchor: ["MIN","CENTER","CENTER"], target_anchor: ["MAX","CENTER","CENTER"], offset: [1,0,0],
    }]);
    expect(solved[1].translation).toEqual([11,3,4]);
  });

  test("constraints follow target movement automatically", () => {
    const moved = structuredClone(instances);
    moved[0].translation = [20,5,-3];
    const solved = solveRecipeConstraints(moved, prototypes, [{
      kind: "ANCHOR", id: "attach-handle", source_instance_id: "handle:0", target_instance_id: "body:0",
      axes: ["X","Y","Z"], source_anchor: ["MIN","CENTER","CENTER"], target_anchor: ["MAX","CENTER","CENTER"], offset: [1,0,0],
    }]);
    expect(solved[1].translation).toEqual([31,8,1]);
  });

  test("conflicting axis claims and cycles fail closed", () => {
    expect(() => solveRecipeConstraints(instances, prototypes, [
      { kind: "ANCHOR", id: "a", source_instance_id: "handle:0", target_instance_id: "body:0", axes: ["X"], source_anchor: ["MIN","MIN","MIN"], target_anchor: ["MAX","MIN","MIN"], offset: [0,0,0] },
      { kind: "ANCHOR", id: "b", source_instance_id: "handle:0", target_instance_id: "body:0", axes: ["X"], source_anchor: ["MIN","MIN","MIN"], target_anchor: ["MAX","MIN","MIN"], offset: [2,0,0] },
    ])).toThrow(/constraint conflict/);
    expect(() => solveRecipeConstraints(instances, prototypes, [
      { kind: "ANCHOR", id: "a", source_instance_id: "handle:0", target_instance_id: "body:0", axes: ["X"], source_anchor: ["MIN","MIN","MIN"], target_anchor: ["MAX","MIN","MIN"] },
      { kind: "ANCHOR", id: "b", source_instance_id: "body:0", target_instance_id: "handle:0", axes: ["X"], source_anchor: ["MIN","MIN","MIN"], target_anchor: ["MAX","MIN","MIN"] },
    ])).toThrow(/cycle/);
  });

  test("compiler applies constraints after lightweight pattern expansion", () => {
    const recipe: AuthoringRecipe = {
      schema: 1, compiler_version: 1, id: "cabinet", name: "cabinet",
      prototypes: [
        { id: "body", name: "body", size: [10,10,10] },
        { id: "handle", name: "handle", size: [2,4,2] },
      ],
      patterns: [
        { kind: "LINEAR", id: "body", prototype_id: "body", count: 1, axis: "X", spacing: 0 },
        { kind: "LINEAR", id: "handle", prototype_id: "handle", count: 1, axis: "X", spacing: 0 },
      ],
      constraints: [{
        kind: "ANCHOR", id: "attach", source_instance_id: "handle:0", target_instance_id: "body:0",
        axes: ["X","Y","Z"], source_anchor: ["MIN","CENTER","CENTER"], target_anchor: ["MAX","CENTER","CENTER"], offset: [1,0,0],
      }],
    };
    const compiled = compileAuthoringRecipe(recipe);
    expect(compiled.placements.find((item) => item.id === "handle:0")?.from).toEqual([11,3,4]);
  });
});
