import { describe, expect, test } from "bun:test";
import { sourceOwnerForCapability } from "@/gateway/control";

describe("modular tool facade routing", () => {
  test("concrete capabilities route to focused implementation owners", () => {
    const expected: Record<string, string> = {
      create_animation: "mcp/server/tools/animation-create.ts",
      bone_rigging: "mcp/server/tools/animation-rigging.ts",
      create_texture: "mcp/server/tools/texture-create.ts",
      list_textures: "mcp/server/tools/texture-read.ts",
      get_texture: "mcp/server/tools/texture-read.ts",
      activate_texture: "mcp/server/tools/texture-assignment.ts",
      add_texture_group: "mcp/server/tools/texture-assignment.ts",
      list_materials: "mcp/server/tools/texture-materials.ts",
      paint_fill_tool: "mcp/server/tools/paint-primitives.ts",
      paint_with_brush: "mcp/server/tools/paint-brush.ts",
      paint_settings: "mcp/server/tools/paint-settings.ts",
      texture_selection: "mcp/server/tools/paint-selection-layers.ts",
      texture_layer_management: "mcp/server/tools/paint-selection-layers.ts",
      add_group: "mcp/server/tools/element-hierarchy.ts",
      modify_group: "mcp/server/tools/element-hierarchy.ts",
      reparent_element: "mcp/server/tools/element-hierarchy.ts",
      remove_element: "mcp/server/tools/element-mutation.ts",
      duplicate_element: "mcp/server/tools/element-mutation.ts",
      rename_element: "mcp/server/tools/element-mutation.ts",
      select_all_of_type: "mcp/server/tools/element-discovery.ts",
      get_selection: "mcp/server/tools/element-discovery.ts",
    };

    for (const [capability, source] of Object.entries(expected)) {
      expect(sourceOwnerForCapability(capability).source, capability).toBe(source);
    }
  });

  test("focused routing never points concrete work at aggregation facades", () => {
    const forbidden = new Set([
      "mcp/server/tools/animation.ts",
      "mcp/server/tools/texture.ts",
      "mcp/server/tools/paint.ts",
      "mcp/server/tools/element.ts",
    ]);

    for (const capability of [
      "create_animation", "bone_rigging",
      "create_texture", "list_textures", "get_texture", "activate_texture", "add_texture_group",
      "paint_fill_tool", "paint_with_brush", "paint_settings", "texture_selection",
      "add_group", "modify_group", "reparent_element", "remove_element", "duplicate_element", "rename_element",
    ]) {
      expect(forbidden.has(sourceOwnerForCapability(capability).source), capability).toBe(false);
    }
  });
});
