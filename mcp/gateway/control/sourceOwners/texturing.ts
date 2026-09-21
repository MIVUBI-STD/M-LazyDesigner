import type { ControlSourceOwner } from "../types";
import { TEXTURING_PATH } from "../contexts";

export const TEXTURING_SOURCE_OWNERS: Record<string, ControlSourceOwner> = {
  create_texture: {
    source: "mcp/server/tools/texture-create.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/authoring/asset-authoring-usage-slimming.test.ts",
  },
  list_textures: {
    source: "mcp/server/tools/texture-read.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-authoring-contract.test.ts",
  },
  get_texture: {
    source: "mcp/server/tools/texture-read.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-authoring-contract.test.ts",
  },
  activate_texture: {
    source: "mcp/server/tools/texture-assignment.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-module-ownership.test.ts",
  },
  add_texture_group: {
    source: "mcp/server/tools/texture-assignment.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/pbr-channel-contract.test.ts",
  },
  list_materials: {
    source: "mcp/server/tools/texture-materials.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-authoring-contract.test.ts",
  },
  get_material_info: {
    source: "mcp/server/tools/texture-materials.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-authoring-contract.test.ts",
  },
  import_texture_set: {
    source: "mcp/server/tools/texture-materials.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-authoring-contract.test.ts",
  },
  paint_fill_tool: {
    source: "mcp/server/tools/paint-primitives.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  draw_shape_tool: {
    source: "mcp/server/tools/paint-primitives.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  gradient_tool: {
    source: "mcp/server/tools/paint-primitives.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  color_picker_tool: {
    source: "mcp/server/tools/paint-primitives.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  copy_brush_tool: {
    source: "mcp/server/tools/paint-primitives.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  paint_settings: {
    source: "mcp/server/tools/paint-settings.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  paint_with_brush: {
    source: "mcp/server/tools/paint-brush.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-stroke.test.ts",
  },
  eraser_tool: {
    source: "mcp/server/tools/paint-brush.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  create_brush_preset: {
    source: "mcp/server/tools/paint-brush.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  load_brush_preset: {
    source: "mcp/server/tools/paint-brush.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  texture_selection: {
    source: "mcp/server/tools/paint-selection-layers.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  texture_layer_management: {
    source: "mcp/server/tools/paint-selection-layers.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  paint_texture_transaction: {
    source: "mcp/server/tools/paint-texture-transaction.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-runtime-live-contract.test.ts",
  },
  manage_material: {
    source: "mcp/server/runtime/consolidatedTools.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/consolidated-validation-preservation.test.ts",
  },
  manage_material_instances: {
    source: "mcp/server/runtime/consolidatedTools.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/consolidated-validation-preservation.test.ts",
  },
  manage_render_profile: {
    source: "mcp/server/tools/render-profile.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/render-profile-binding.test.ts",
  },
  manage_uv_layout: {
    source: "mcp/server/runtime/uvLayoutService.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/uv-registration-readiness.test.ts",
  },
};
