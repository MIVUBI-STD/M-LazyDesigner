import { describe, expect, test } from "bun:test";

const source = await Bun.file(
  new URL("../server/runtime/consolidatedTools.ts", import.meta.url)
).text();

describe("Consolidated capability validation preservation", () => {
  test("consolidated branches are first-class addressable schema registries", () => {
    for (const registry of [
      "consolidatedInspectionBranches",
      "consolidatedMaterialBranches",
      "consolidatedAnimationTimelineBranches",
      "consolidatedMaterialInstanceBranches",
    ]) {
      expect(source).toContain(`export const ${registry}`);
    }
    expect(source).toContain('discriminator: "mode"');
    expect(source).toContain('discriminator: "operation"');
  });

  test("inspection branches reuse canonical executor schemas", () => {
    for (const signature of [
      'withToolBranch(listOutlineParameters, "mode", "outline")',
      'withToolBranch(findElementsByCriteriaParameters, "mode", "search")',
      'withToolBranch(inspectElementParameters, "mode", "detail")',
    ]) {
      expect(source).toContain(signature);
    }
  });

  test("material branches reuse canonical executor schemas", () => {
    for (const signature of [
      'withToolBranch(createPbrMaterialParameters, "operation", "create")',
      'withToolBranch(configureMaterialParameters, "operation", "configure")',
      'withToolBranch(assignTextureChannelParameters, "operation", "assign_channel")',
      'withToolBranch(saveMaterialConfigParameters, "operation", "save")',
    ]) {
      expect(source).toContain(signature);
    }
  });

  test("material save exposes a persistence-only continuation receipt", () => {
    expect(source).toContain('operation !== "save"');
    expect(source).toContain('scope: "material_persistence_only"');
  });

  test("animation timeline branches reuse canonical executor schemas", () => {
    for (const signature of [
      'withToolBranch(manageKeyframesParameters, "operation", "keyframes")',
      'withToolBranch(animationGraphEditorParameters, "operation", "graph")',
      'withToolBranch(animationTimelineParameters, "operation", "timeline")',
      'withToolBranch(batchKeyframeOperationsParameters, "operation", "batch")',
      'withToolBranch(animationCopyPasteParameters, "operation", "copy_paste")',
    ]) {
      expect(source).toContain(signature);
    }
  });

  test("material-instance branches reuse canonical executor schemas", () => {
    for (const signature of [
      'withToolBranch(listMaterialInstancesParametersSchema, "operation", "list")',
      'withToolBranch(getFaceMaterialInstancesParametersSchema, "operation", "get")',
      'withToolBranch(setFaceMaterialInstanceParametersSchema, "operation", "set")',
      'withToolBranch(bulkSetMaterialInstancesParametersSchema, "operation", "bulk_set")',
      'withToolBranch(clearMaterialInstancesParametersSchema, "operation", "clear")',
    ]) {
      expect(source).toContain(signature);
    }
  });

  test("consolidation never rebuilds retained executor schemas with intersections", () => {
    for (const schema of [
      "listOutlineParameters",
      "findElementsByCriteriaParameters",
      "inspectElementParameters",
      "createPbrMaterialParameters",
      "configureMaterialParameters",
      "assignTextureChannelParameters",
      "saveMaterialConfigParameters",
      "manageKeyframesParameters",
      "animationGraphEditorParameters",
      "animationTimelineParameters",
      "batchKeyframeOperationsParameters",
      "animationCopyPasteParameters",
      "listMaterialInstancesParametersSchema",
      "getFaceMaterialInstancesParametersSchema",
      "setFaceMaterialInstanceParametersSchema",
      "bulkSetMaterialInstancesParametersSchema",
      "clearMaterialInstancesParametersSchema",
    ]) {
      expect(source).not.toContain(`${schema}.and(`);
      expect(source).not.toContain(`${schema}.merge(`);
    }
  });
});
