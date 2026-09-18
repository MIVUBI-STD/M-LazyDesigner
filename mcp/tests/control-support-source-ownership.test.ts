import { describe, expect, test } from "bun:test";
import { sourceOwnerForCapability } from "@/gateway/control";

const expectedOwners = {
  list_textures: "mcp/server/tools/texture-read.ts",
  get_texture: "mcp/server/tools/texture-read.ts",
  add_texture_group: "mcp/server/tools/texture-assignment.ts",
  import_texture_set: "mcp/server/tools/texture-materials.ts",
  gradient_tool: "mcp/server/tools/paint-primitives.ts",
  copy_brush_tool: "mcp/server/tools/paint-primitives.ts",
  paint_settings: "mcp/server/tools/paint-settings.ts",
  texture_selection: "mcp/server/tools/paint-selection-layers.ts",
  texture_layer_management: "mcp/server/tools/paint-selection-layers.ts",
  list_locator_elements: "mcp/server/tools/locators.ts",
  select_all_of_type: "mcp/server/tools/element-discovery.ts",
  get_selection: "mcp/server/tools/element-discovery.ts",
} as const;

describe("Control support capability source ownership", () => {
  test("support capabilities point at their concrete implementation owner", async () => {
    for (const [capability, source] of Object.entries(expectedOwners)) {
      const owner = sourceOwnerForCapability(capability);
      expect(owner.source, capability).toBe(source);
      expect(
        await Bun.file(new URL(`../../${owner.source}`, import.meta.url)).exists(),
        owner.source
      ).toBe(true);
      if (owner.test_owner) {
        expect(
          await Bun.file(new URL(`../../${owner.test_owner}`, import.meta.url)).exists(),
          owner.test_owner
        ).toBe(true);
      }
    }
  });
});
