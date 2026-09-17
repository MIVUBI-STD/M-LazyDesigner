import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("texturing hot-path routing", () => {
  test("advanced editor-state tools stay conditional while consolidated material authoring stays primary", async () => {
    const skill = await source("../.agents/skills/lazydesigner-texturing/SKILL.md");
    const supportStart = skill.indexOf("## Conditional Support — Not Default Routing");
    const supportEnd = skill.indexOf("## First-Call Invariants", supportStart);
    const support = skill.slice(supportStart, supportEnd);

    expect(supportStart).toBeGreaterThan(-1);
    expect(support).toMatch(/not normal hot path/i);
    expect(support).toMatch(/Conditional on user intent/i);

    for (const tool of [
      "color_picker_tool",
      "copy_brush_tool",
      "paint_settings",
      "create_brush_preset",
      "load_brush_preset",
      "texture_selection",
      "texture_layer_management",
      "add_texture_group",
      "list_materials",
      "get_material_info",
      "import_texture_set",
    ]) expect(support).toContain(tool);

    for (const direct of [
      "create_texture",
      "draw_shape_tool",
      "paint_fill_tool",
      "paint_with_brush",
      "eraser_tool",
      "manage_material",
      "manage_material_instances",
    ]) expect(skill).toContain(direct);

    expect(support).toMatch(/no extra discovery\/readback/i);
    expect(support).not.toContain("manage_material");
    expect(skill).not.toContain("create_pbr_material / configure_material / assign_texture_channel");
  });
});
