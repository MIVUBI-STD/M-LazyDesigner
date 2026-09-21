import { describe, expect, test } from "bun:test";

describe("Blockbench parametric recipe adapter ownership", () => {
  test("runtime adapter is a narrow native boundary, not another planner or MCP surface", async () => {
    const source = await Bun.file("server/runtime/authoringRecipeRuntime.ts").text();
    for (const marker of [
      "readBlockbenchAuthoringRecipeOwnedState",
      "createBlockbenchAuthoringRecipeApplyAdapter",
      "Undo.initEdit",
      "Undo.finishEdit(\"LazyDesigner parametric recipe\"",
      "Undo.cancelEdit(true)",
      "authoringRecipeOwnershipPatch",
      "cube.mapAutoUV()",
    ]) expect(source).toContain(marker);
    for (const forbidden of [
      "createTool(",
      "compileAuthoringRecipe(",
      "planIncrementalRecipeRebuild(",
      "search_capabilities",
      "invoke_capability",
    ]) expect(source).not.toContain(forbidden);
  });

  test("existing manage_cubes remains the public primitive owner", async () => {
    const cubes = await Bun.file("server/tools/cubes.ts").text();
    expect(cubes).toContain('name: "manage_cubes"');
    expect(cubes).not.toContain("createBlockbenchAuthoringRecipeApplyAdapter");
  });
});
