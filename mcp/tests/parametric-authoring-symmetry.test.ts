import { describe, expect, test } from "bun:test";
import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import { compileAuthoringRecipe } from "@/lib/authoringRecipe/compiler";

describe("Parametric Authoring G3 symmetry relationships", () => {
  test("mirrors one solved instance across an explicit plane and preserves downstream policy", () => {
    const recipe: AuthoringRecipe = {
      schema: 1, compiler_version: 1, id: "arms", name: "arms",
      prototypes: [{ id: "arm", name: "arm", size: [2,8,2], semantic_group: "ARM_LEFT" }],
      patterns: [{ kind: "LINEAR", id: "left", prototype_id: "arm", count: 1, axis: "X", spacing: 0, start: [-6,0,0] }],
      symmetry: [{
        id: "arms-lr", source_instance_id: "left:0", target_instance_id: "right:0",
        plane: { axis: "X", position: 0 },
        semantic_pair: { source: "ARM_LEFT", target: "ARM_RIGHT" },
        uv_policy: "SHARE", texture_policy: "MIRROR", rig_policy: "MIRROR",
      }],
    };
    const compiled = compileAuthoringRecipe(recipe);
    expect(compiled.placements.map((item) => [item.id, item.from])).toEqual([
      ["left:0", [-6,0,0]],
      ["right:0", [4,0,0]],
    ]);
    expect(compiled.symmetry_relationships[0]).toMatchObject({
      source_instance_id: "left:0", target_instance_id: "right:0", uv_policy: "SHARE", texture_policy: "MIRROR", rig_policy: "MIRROR",
    });
    expect(compiled.metrics.symmetry_generated_count).toBe(1);
  });

  test("symmetry happens after relational constraint solving", () => {
    const recipe: AuthoringRecipe = {
      schema: 1, compiler_version: 1, id: "handles", name: "handles",
      prototypes: [
        { id: "body", name: "body", size: [10,10,10] },
        { id: "handle", name: "handle", size: [2,4,2], semantic_group: "HANDLE_LEFT" },
      ],
      patterns: [
        { kind: "LINEAR", id: "body", prototype_id: "body", count: 1, axis: "X", spacing: 0, start: [-5,0,0] },
        { kind: "LINEAR", id: "left", prototype_id: "handle", count: 1, axis: "X", spacing: 0 },
      ],
      constraints: [{ kind: "ANCHOR", id: "attach-left", source_instance_id: "left:0", target_instance_id: "body:0", axes: ["X","Y"], source_anchor: ["MAX","CENTER","CENTER"], target_anchor: ["MIN","CENTER","CENTER"], offset: [-1,0,0] }],
      symmetry: [{ id: "handles-lr", source_instance_id: "left:0", target_instance_id: "right:0", plane: { axis: "X", position: 0 }, uv_policy: "UNIQUE", texture_policy: "UNIQUE", rig_policy: "INDEPENDENT" }],
    };
    const compiled = compileAuthoringRecipe(recipe);
    const left = compiled.placements.find((item) => item.id === "left:0")!;
    const right = compiled.placements.find((item) => item.id === "right:0")!;
    expect(left.from[0]).toBe(-8);
    expect(right.from[0]).toBe(6);
    expect(left.from[1]).toBe(3);
    expect(right.from[1]).toBe(3);
  });

  test("rotated mirror sources fail closed until handed orientation policy exists", () => {
    expect(() => compileAuthoringRecipe({
      schema: 1, compiler_version: 1, id: "rot", name: "rot",
      prototypes: [{ id: "part", name: "part", size: [2,2,2], rotation: [0,30,0] }],
      patterns: [{ kind: "LINEAR", id: "left", prototype_id: "part", count: 1, axis: "X", spacing: 0, start: [-4,0,0] }],
      symmetry: [{ id: "mirror", source_instance_id: "left:0", target_instance_id: "right:0", plane: { axis: "X", position: 0 }, uv_policy: "UNIQUE", texture_policy: "UNIQUE", rig_policy: "INDEPENDENT" }],
    })).toThrow(/refuses rotated source/);
  });

  test("duplicate target identity fails before realization", () => {
    expect(() => compileAuthoringRecipe({
      schema: 1, compiler_version: 1, id: "dup", name: "dup",
      prototypes: [{ id: "part", name: "part", size: [2,2,2] }],
      patterns: [
        { kind: "LINEAR", id: "left", prototype_id: "part", count: 1, axis: "X", spacing: 0 },
        { kind: "LINEAR", id: "right", prototype_id: "part", count: 1, axis: "X", spacing: 0 },
      ],
      symmetry: [{ id: "mirror", source_instance_id: "left:0", target_instance_id: "right:0", plane: { axis: "X", position: 0 }, uv_policy: "SHARE", texture_policy: "MIRROR", rig_policy: "MIRROR" }],
    })).toThrow(/target instance already exists/);
  });
});
