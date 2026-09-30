import { describe, expect, test } from "bun:test";
import { sourceOwnerForCapability } from "../../gateway/development/sourceOwners";

const expectedOwners: Readonly<Record<string, string>> = {
  inspect_elements: "mcp/server/runtime/consolidatedTools.ts",
  manage_material: "mcp/server/runtime/consolidatedTools.ts",
  manage_material_instances: "mcp/server/runtime/consolidatedTools.ts",
  manage_animation_timeline: "mcp/server/runtime/consolidatedTools.ts",
  switch_authoring_phase: "mcp/server/runtime/phaseControl.ts",

  list_textures: "mcp/server/tools/texture/read.ts",
  get_texture: "mcp/server/tools/texture/read.ts",
  add_texture_group: "mcp/server/tools/texture/assignment.ts",
  import_texture_set: "mcp/server/tools/texture/materials.ts",
  gradient_tool: "mcp/server/tools/paint/primitives.ts",
  copy_brush_tool: "mcp/server/tools/paint/primitives.ts",
  paint_settings: "mcp/server/tools/paint/settings.ts",
  texture_selection: "mcp/server/tools/paint/selectionLayers.ts",
  texture_layer_management: "mcp/server/tools/paint/selectionLayers.ts",
  list_locator_elements: "mcp/server/tools/geometry/locators.ts",
  select_all_of_type: "mcp/server/tools/element/discovery.ts",
  get_selection: "mcp/server/tools/element/discovery.ts",
};

describe("development source ownership contract", () => {
  test("representative capabilities route to canonical implementation owners", async () => {
    for (const [capability, source] of Object.entries(expectedOwners)) {
      const owner = sourceOwnerForCapability(capability);
      expect(owner.source, capability).toBe(source);
      expect(
        await Bun.file(new URL(`../../../${owner.source}`, import.meta.url)).exists(),
        owner.source
      ).toBe(true);

      if (owner.anchor_test) {
        expect(
          await Bun.file(new URL(`../../../${owner.anchor_test}`, import.meta.url)).exists(),
          owner.anchor_test
        ).toBe(true);
      }
    }
  });

  test("representative owners never resolve through migrated compatibility wrappers", () => {
    const wrapperFragments = [
      "/server/tools/texture-read.ts",
      "/server/tools/texture-assignment.ts",
      "/server/tools/texture-materials.ts",
      "/server/tools/paint-primitives.ts",
      "/server/tools/paint-settings.ts",
      "/server/tools/paint-selection-layers.ts",
      "/server/tools/locators.ts",
      "/server/tools/element-discovery.ts",
    ];

    for (const capability of Object.keys(expectedOwners)) {
      const source = sourceOwnerForCapability(capability).source;
      expect(
        wrapperFragments.some((fragment) => source.includes(fragment)),
        `${capability}: ${source}`
      ).toBe(false);
    }
  });
});
