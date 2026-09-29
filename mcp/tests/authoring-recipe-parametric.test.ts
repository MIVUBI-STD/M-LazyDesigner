import { describe, expect, test } from "bun:test";
import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import { compileAuthoringRecipe } from "@/lib/authoringRecipe/compiler";
import { rewriteAuthoringRecipeForSemanticEdit } from "@/lib/authoringRecipe/semanticRewrite";
import { planIncrementalRecipeRebuild } from "@/lib/authoringRecipe/incremental";

function chairRecipe(): AuthoringRecipe {
  return {
    schema: 1,
    compiler_version: 1,
    id: "chair",
    name: "chair",
    prototypes: [
      {
        id: "seat_proto",
        name: "seat",
        size: [8, 2, 8],
        semantic_group: "seat",
      },
      {
        id: "leg_proto",
        name: "leg",
        size: [2, 6, 2],
        semantic_group: "leg",
      },
    ],
    patterns: [
      {
        kind: "LINEAR",
        id: "seat",
        prototype_id: "seat_proto",
        count: 1,
        axis: "X",
        spacing: 0,
        start: [0, 6, 0],
        semantic_group: "seat",
      },
      {
        kind: "LINEAR",
        id: "leg",
        prototype_id: "leg_proto",
        count: 1,
        axis: "X",
        spacing: 0,
        start: [0, 0, 0],
        semantic_group: "leg",
      },
    ],
    constraints: [
      {
        kind: "ANCHOR",
        id: "leg_follows_seat_right_edge",
        source_instance_id: "leg:0",
        target_instance_id: "seat:0",
        axes: ["X"],
        source_anchor: ["MIN", "MIN", "MIN"],
        target_anchor: ["MAX", "MIN", "MIN"],
        offset: [-2, 0, 0],
      },
    ],
  };
}

describe("lightweight parametric authoring relationships", () => {
  test("anchor constraint follows a resized primary mass without reauthoring the dependent pattern", () => {
    const beforeRecipe = chairRecipe();
    const before = compileAuthoringRecipe(beforeRecipe);
    const beforeLeg = before.placements.find((entry) => entry.id === "leg:0")!;
    expect(beforeLeg.from[0]).toBe(6);

    const nextRecipe = rewriteAuthoringRecipeForSemanticEdit(beforeRecipe, {
      target: { semantic_group: "seat" },
      operation: {
        kind: "RESIZE_AXIS",
        axis: "X",
        mode: "SET",
        value: 12,
        anchor: "MIN",
      },
    });
    const after = compileAuthoringRecipe(nextRecipe);
    const afterSeat = after.placements.find((entry) => entry.id === "seat:0")!;
    const afterLeg = after.placements.find((entry) => entry.id === "leg:0")!;

    expect(afterSeat.to[0]).toBe(12);
    expect(afterLeg.from[0]).toBe(10);
    expect(afterLeg.to[0]).toBe(12);
  });

  test("incremental rebuild distinguishes dependency propagation from directly authored geometry", () => {
    const beforeRecipe = chairRecipe();
    const nextRecipe = rewriteAuthoringRecipeForSemanticEdit(beforeRecipe, {
      target: { semantic_group: "seat" },
      operation: {
        kind: "RESIZE_AXIS",
        axis: "X",
        mode: "ADD",
        value: 4,
        anchor: "MIN",
      },
    });

    const rebuild = planIncrementalRecipeRebuild(beforeRecipe, nextRecipe);

    expect(rebuild.upserts.map((entry) => entry.id)).toEqual([
      "leg:0",
      "seat:0",
    ]);
    expect(rebuild.constraint_propagated_instance_ids).toEqual(["leg:0"]);
    expect(rebuild.metrics.constraint_propagated_count).toBe(1);
    expect(rebuild.metrics.native_affected_count).toBe(2);
  });

  test("direct edits of the constrained child are not mislabeled as propagation", () => {
    const beforeRecipe = chairRecipe();
    const nextRecipe: AuthoringRecipe = structuredClone(beforeRecipe);
    const leg = nextRecipe.prototypes.find((entry) => entry.id === "leg_proto")!;
    leg.size = [3, 6, 2];

    const rebuild = planIncrementalRecipeRebuild(beforeRecipe, nextRecipe);

    expect(rebuild.upserts.map((entry) => entry.id)).toContain("leg:0");
    expect(rebuild.constraint_propagated_instance_ids).toEqual([]);
  });
});
