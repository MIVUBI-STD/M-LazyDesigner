import type { McpToolPhaseCategory } from "../authoringPhase";

export type CapabilityTier =
  | "primary"
  | "support"
  | "experimental"
  | "maintenance";

export type CapabilityExecutionClass = "fast" | "normal" | "heavy";
export type CapabilityVerificationClass =
  | "not_applicable"
  | "receipt_only"
  | "focused_read"
  | "visual";

export type CapabilityLifecycleStage = "active" | "deprecated";
export type CapabilityLifecycle = {
  stage: CapabilityLifecycleStage;
  replacement: string | null;
};

export type CapabilityEffects = {
  projectAffinity: "preserve" | "adopt_created_project";
  phaseAffinity: "preserve" | "update_from_result";
  invalidateCatalog: boolean;
};

export type CapabilityCoreManifestEntry = {
  tier?: CapabilityTier;
  aliases?: readonly string[];
  phase?: McpToolPhaseCategory;
  executionClass?: CapabilityExecutionClass;
  verificationClass?: CapabilityVerificationClass;
  lifecycle?: CapabilityLifecycle;
  effects?: CapabilityEffects;
};

const PRIMARY: readonly string[] = [
  "get_project_info", "inspect_elements", "capture_model_views", "export_model",
  "undo", "redo", "switch_authoring_phase", "manage_cubes", "add_group",
  "modify_group", "reparent_element", "remove_element", "rename_element",
  "manage_locator", "create_texture", "list_textures", "get_texture",
  "paint_fill_tool", "draw_shape_tool", "gradient_tool", "copy_brush_tool",
  "texture_layer_management", "paint_with_brush", "eraser_tool",
  "paint_texture_transaction", "manage_material", "manage_material_instances",
  "manage_render_profile", "manage_uv_layout", "create_animation",
  "inspect_animation", "manage_animation_timeline", "manage_animation_effects",
  "manage_animation_controller", "inspect_particle", "manage_particle",
];

const MAINTENANCE: readonly string[] = [
  "trigger_action", "emulate_clicks", "fill_dialog", "risky_eval", "from_geo_json",
];

const CORE_PHASE: readonly string[] = [
  "create_project", "get_project_info", "inspect_elements", "capture_model_views",
  "inspect_model_bounds", "export_model", "undo", "redo", "get_undo_stack",
  "switch_authoring_phase", "list_textures",
];

const GEOMETRY_PHASE: readonly string[] = [
  "add_group", "manage_cubes", "duplicate_element", "reparent_element",
  "manage_locator", "manage_null_object", "modify_group", "remove_element",
  "rename_element", "select_all_of_type", "get_selection", "bone_rigging",
];

const TEXTURING_PHASE: readonly string[] = [
  "create_texture", "get_texture", "activate_texture", "apply_texture",
  "add_texture_group", "create_pbr_material", "configure_material",
  "list_materials", "get_material_info", "import_texture_set",
  "assign_texture_channel", "save_material_config", "paint_fill_tool",
  "draw_shape_tool", "gradient_tool", "color_picker_tool", "copy_brush_tool",
  "eraser_tool", "paint_settings", "paint_with_brush", "create_brush_preset",
  "load_brush_preset", "texture_selection", "texture_layer_management",
  "paint_texture_transaction", "manage_material", "get_face_material_instances",
  "set_face_material_instance", "list_material_instances",
  "bulk_set_material_instances", "clear_material_instances",
  "manage_material_instances", "manage_render_profile", "manage_uv_layout",
  "filter_by_material",
];

const ANIMATION_PHASE: readonly string[] = [
  "create_animation", "manage_keyframes", "animation_graph_editor",
  "animation_timeline", "batch_keyframe_operations", "animation_copy_paste",
  "inspect_animation", "manage_animation_timeline", "manage_animation_effects",
  "manage_animation_controller", "inspect_particle", "manage_particle",
];

const FAST: readonly string[] = [
  "get_project_info", "inspect_elements", "list_textures", "get_texture",
  "inspect_animation", "inspect_particle", "get_undo_stack",
];

const HEAVY: readonly string[] = [
  "capture_model_views", "paint_texture_transaction", "export_model",
];

const RECEIPT_ONLY: readonly string[] = [
  "create_project", "rename_element", "switch_authoring_phase",
];

const FOCUSED_READ: readonly string[] = [
  "create_project", "add_group", "modify_group", "reparent_element",
  "remove_element", "rename_element", "manage_locator", "manage_null_object",
  "bone_rigging", "add_texture_group", "import_texture_set", "manage_material",
  "manage_material_instances", "manage_render_profile",
  "manage_animation_controller", "manage_animation_effects", "manage_particle",
];

const VISUAL: readonly string[] = [
  "manage_cubes", "duplicate_element", "capture_model_views", "create_texture",
  "paint_fill_tool", "draw_shape_tool", "gradient_tool", "copy_brush_tool",
  "texture_layer_management", "paint_with_brush", "eraser_tool",
  "paint_texture_transaction", "manage_uv_layout", "create_animation",
  "manage_animation_timeline", "undo", "redo",
];

const ALIASES: Readonly<Record<string, readonly string[]>> = {
  manage_cubes: [
    "geometry create", "create cube", "create cubes", "cube batch",
    "bedrock geometry", "geometry batch", "buat kubus",
    "ubah ukuran kubus", "geser kubus",
  ],
  add_group: [
    "create bone", "create bones", "add bone", "add bones",
    "group batch", "bone batch",
  ],
  modify_group: [
    "set pivot", "bone pivot", "group pivot", "move group",
    "translate group", "ubah pivot", "geser tulang", "ubah posisi bone",
  ],
  reparent_element: [
    "parent bone", "unparent bone", "reparent bone", "move parent", "change parent",
  ],
  manage_locator: [
    "locator", "attachment point", "socket", "anchor point",
    "titik attachment", "titik pegangan",
  ],
  bone_rigging: [
    "inverse kinematics", "ik target", "ik controller", "ik root",
    "ik source", "ik pole", "pole vector", "mirror bone", "rig mirror",
  ],
  apply_texture: [
    "assign texture", "texture cube", "texture face", "map texture",
  ],
  paint_texture_transaction: [
    "atomic paint", "exact pixel", "exact pixels", "revision protected paint",
    "cat pixel tepat", "ubah pixel persis", "edit pixel presisi",
  ],
  manage_render_profile: [
    "alpha cutout translucent", "render material",
    "entity alphatest alphablend emissive",
  ],
  manage_uv_layout: [
    "uv layout", "uv pack", "uv mapping", "texel density", "repack uv",
    "pack islands", "atur uv", "rapikan uv",
  ],
  manage_animation_timeline: [
    "animation properties", "native animation properties", "animation molang",
    "rotation space", "tambah keyframe", "ubah keyframe", "atur timeline animasi",
  ],
  manage_animation_controller: [
    "state machine", "nested controller", "blend curve", "transition curve",
    "controller animasi", "state animasi", "transisi animasi",
  ],
  manage_animation_effects: [
    "animation sound", "animation particle", "animation timeline event",
    "suara animasi", "particle animasi", "efek animasi",
  ],
  inspect_particle: [
    "inspect particle", "particle emitter", "snowstorm particle", "particle molang",
  ],
  manage_particle: [
    "particle emitter", "bedrock particle", "snowstorm", "particle molang",
    "buat particle", "ubah particle", "asap particle",
  ],
};

const map = new Map<string, CapabilityCoreManifestEntry>();

function patch(names: readonly string[], value: CapabilityCoreManifestEntry): void {
  for (const name of names) {
    map.set(name, { ...(map.get(name) ?? {}), ...value });
  }
}

patch(PRIMARY, { tier: "primary" });
patch(MAINTENANCE, { tier: "maintenance" });
patch(CORE_PHASE, { phase: "core" });
patch(GEOMETRY_PHASE, { phase: "geometry" });
patch(TEXTURING_PHASE, { phase: "texturing" });
patch(ANIMATION_PHASE, { phase: "animation" });
patch(FAST, { executionClass: "fast" });
patch(HEAVY, { executionClass: "heavy" });
patch(RECEIPT_ONLY, { verificationClass: "receipt_only" });
patch(FOCUSED_READ, { verificationClass: "focused_read" });
patch(VISUAL, { verificationClass: "visual" });

for (const [name, aliases] of Object.entries(ALIASES)) {
  map.set(name, { ...(map.get(name) ?? {}), aliases });
}

map.set("create_project", {
  ...(map.get("create_project") ?? {}),
  effects: {
    projectAffinity: "adopt_created_project",
    phaseAffinity: "preserve",
    invalidateCatalog: true,
  },
});

map.set("switch_authoring_phase", {
  ...(map.get("switch_authoring_phase") ?? {}),
  effects: {
    projectAffinity: "preserve",
    phaseAffinity: "update_from_result",
    invalidateCatalog: true,
  },
});

export const CAPABILITY_CORE_MANIFEST: ReadonlyMap<
  string,
  CapabilityCoreManifestEntry
> = map;

export function getCapabilityCoreManifestEntry(
  name: string
): CapabilityCoreManifestEntry | null {
  return CAPABILITY_CORE_MANIFEST.get(name) ?? null;
}

export function capabilityPhaseByName(
  name: string
): McpToolPhaseCategory | null {
  return CAPABILITY_CORE_MANIFEST.get(name)?.phase ?? null;
}
