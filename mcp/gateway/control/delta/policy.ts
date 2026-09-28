import type { ControlFreshnessScope } from "../types";

export const STATE_MUTATIONS = new Set([
  "create_project", "undo", "redo",
  "manage_cubes", "add_group", "modify_group", "duplicate_element", "reparent_element", "remove_element",
  "rename_element", "manage_locator", "manage_null_object", "bone_rigging",
  "create_texture", "apply_texture", "add_texture_group", "import_texture_set",
  "paint_fill_tool", "draw_shape_tool", "gradient_tool", "copy_brush_tool",
  "paint_with_brush", "eraser_tool", "texture_layer_management", "paint_texture_transaction",
  "create_pbr_material", "configure_material", "assign_texture_channel", "save_material_config",
  "set_face_material_instance", "bulk_set_material_instances", "clear_material_instances",
  "manage_material", "manage_material_instances", "manage_render_profile", "manage_uv_layout", "create_animation",
  "manage_keyframes", "animation_graph_editor", "animation_timeline",
  "batch_keyframe_operations", "animation_copy_paste",
  "manage_animation_timeline", "manage_animation_effects", "manage_animation_controller",
  "manage_particle",
]);

export const UV_FIELDS = new Set([
  "faces", "box_uv", "uv_offset", "mirror_uv", "autouv",
]);

export const SHAPE_FIELDS = new Set([
  "from", "to", "inflate",
]);

export const HIERARCHY_OR_MOTION_STRUCTURE = new Set([
  "add_group", "modify_group", "reparent_element", "rename_element",
  "manage_locator", "manage_null_object", "bone_rigging",
]);

export const TEXTURE_APPEARANCE_MUTATIONS = new Set([
  "create_texture", "apply_texture", "add_texture_group",
  "paint_fill_tool", "draw_shape_tool", "gradient_tool", "copy_brush_tool",
  "paint_with_brush", "eraser_tool", "texture_layer_management", "paint_texture_transaction",
]);

export const MATERIAL_RENDER_MUTATIONS = new Set([
  "create_pbr_material", "configure_material", "assign_texture_channel", "save_material_config",
  "set_face_material_instance", "bulk_set_material_instances", "clear_material_instances",
  "manage_material", "manage_material_instances", "manage_render_profile",
]);

export const ANIMATION_MOTION_MUTATIONS = new Set([
  "create_animation", "manage_keyframes", "animation_graph_editor",
  "animation_timeline", "batch_keyframe_operations", "animation_copy_paste",
  "manage_animation_timeline",
]);

export const ALL_FRESHNESS_SCOPES: readonly ControlFreshnessScope[] = [
  "GEOMETRY_STRUCTURE",
  "UV_MAPPING",
  "TEXTURE_APPEARANCE",
  "MATERIAL_RENDER",
  "ANIMATION_MOTION",
  "ANIMATION_CONTROLLER",
  "ANIMATION_EFFECTS",
  "PARTICLE_SYSTEM",
];
