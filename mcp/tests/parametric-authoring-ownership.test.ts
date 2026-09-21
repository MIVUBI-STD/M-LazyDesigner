import { describe, expect, test } from "bun:test";
import {
  RECIPE_ID_PROPERTY, RECIPE_INSTANCE_ID_PROPERTY, authoringRecipeOwnershipPatch, readAuthoringRecipeCubeOwnership,
} from "@/server/runtime/authoringRecipeOwnership";

describe("Parametric authoring persistent Cube ownership", () => {
  test("ownership patch uses private namespaced fields and round-trips pure identity", () => {
    const patch = authoringRecipeOwnershipPatch({ recipe_id: "vehicle", instance_id: "front_left/spokes:3" });
    expect(patch).toEqual({
      [RECIPE_ID_PROPERTY]: "vehicle",
      [RECIPE_INSTANCE_ID_PROPERTY]: "front_left/spokes:3",
    });
    expect(readAuthoringRecipeCubeOwnership(patch)).toEqual({ recipe_id: "vehicle", instance_id: "front_left/spokes:3" });
  });

  test("unowned Cube is null while partial or malformed ownership fails closed", () => {
    expect(readAuthoringRecipeCubeOwnership({})).toBeNull();
    expect(() => readAuthoringRecipeCubeOwnership({ [RECIPE_ID_PROPERTY]: "vehicle" })).toThrow(/incomplete/);
    expect(() => authoringRecipeOwnershipPatch({ recipe_id: " ", instance_id: "x" })).toThrow(/invalid/);
  });

  test("plugin lifecycle registers and removes recipe properties without touching tool catalog", async () => {
    const source = await Bun.file("index.ts").text();
    const owner = await Bun.file("server/runtime/authoringRecipeOwnership.ts").text();
    expect(source).toContain("registerAuthoringRecipeOwnershipProperties();");
    expect(source).toContain("unregisterAuthoringRecipeOwnershipProperties();");
    expect(owner).toContain("new Property(Cube, \"string\", RECIPE_ID_PROPERTY");
    expect(owner).toContain("export: false");
    expect(owner).not.toContain("createTool(");
  });
});
