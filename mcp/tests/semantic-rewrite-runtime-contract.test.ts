import { describe, expect, test } from "bun:test";
import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import { rewriteAuthoringRecipeForSemanticEdit } from "@/lib/authoringRecipe/semanticRewrite";

describe("semantic authoring recipe rewrite", () => {
  test("translates RADIAL ownership through its center instead of a nonexistent start field", () => {
    const recipe: AuthoringRecipe = {
      schema: 1,
      compiler_version: 1,
      id: "radial",
      name: "radial",
      prototypes: [
        { id: "blade", name: "blade", size: [1, 2, 1] },
      ],
      patterns: [
        {
          kind: "RADIAL",
          id: "ring",
          prototype_id: "blade",
          count: 1,
          axis: "Y",
          radius: 4,
          center: [2, 3, 4],
        },
      ],
    };

    const rewritten = rewriteAuthoringRecipeForSemanticEdit(recipe, {
      target: { instance_ids: ["ring:0"] },
      operation: { kind: "TRANSLATE", delta: [1, -2, 3] },
    });

    const pattern = rewritten.patterns[0];
    expect(pattern.kind).toBe("RADIAL");
    if (pattern.kind !== "RADIAL") throw new Error("Expected RADIAL pattern.");
    expect(pattern.center).toEqual([3, 1, 7]);
  });
});
