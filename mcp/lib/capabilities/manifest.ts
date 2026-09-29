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

export const CAPABILITY_SEMANTIC_SCOPES = [
  "GEOMETRY_STRUCTURE",
  "UV_MAPPING",
  "TEXTURE_APPEARANCE",
  "MATERIAL_RENDER",
  "ANIMATION_MOTION",
  "ANIMATION_CONTROLLER",
  "ANIMATION_EFFECTS",
  "PARTICLE_SYSTEM",
] as const;

export type CapabilitySemanticScope =
  (typeof CAPABILITY_SEMANTIC_SCOPES)[number];

export type CapabilityStateClass =
  | "cross_authoring"
  | "geometry"
  | "uv"
  | "texture_appearance"
  | "texture_material"
  | "material_render"
  | "animation_motion"
  | "animation_controller"
  | "animation_effects"
  | "particle"
  | "persistence";

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
  stateClass?: CapabilityStateClass;
  defaultStaleScopes?: readonly CapabilitySemanticScope[];
  lifecycle?: CapabilityLifecycle;
  effects?: CapabilityEffects;
};

/**
 * Canonical capability metadata declaration.
 *
 * Each capability is declared once. Search/routing, phase, semantic-state,
 * verification, execution-cost and lifecycle projections read from this table
 * instead of maintaining parallel membership lists.
 *
 * Omitted properties intentionally use the public defaults in
 * capabilityMetadata.ts.
 */
export const CAPABILITY_DEFINITIONS = {
  "activate_texture": { phase: "texturing" },
  "add_group": { tier: "primary", phase: "geometry", stateClass: "geometry", defaultStaleScopes: ["GEOMETRY_STRUCTURE","ANIMATION_MOTION"], verificationClass: "focused_read", aliases: ["create bone","create bones","add bone","add bones","group batch","bone batch"] },
  "add_texture_group": { phase: "texturing", stateClass: "texture_material", defaultStaleScopes: ["TEXTURE_APPEARANCE","MATERIAL_RENDER"], verificationClass: "focused_read" },
  "animation_copy_paste": { phase: "animation", stateClass: "animation_motion", defaultStaleScopes: ["ANIMATION_MOTION"], verificationClass: "visual" },
  "animation_graph_editor": { phase: "animation", stateClass: "animation_motion", defaultStaleScopes: ["ANIMATION_MOTION"], verificationClass: "visual" },
  "animation_timeline": { phase: "animation", stateClass: "animation_motion", defaultStaleScopes: ["ANIMATION_MOTION"], verificationClass: "visual" },
  "apply_texture": { phase: "texturing", stateClass: "texture_appearance", defaultStaleScopes: ["TEXTURE_APPEARANCE"], verificationClass: "visual", aliases: ["assign texture","texture cube","texture face","map texture"] },
  "assign_texture_channel": { phase: "texturing", stateClass: "material_render", defaultStaleScopes: ["MATERIAL_RENDER"], verificationClass: "focused_read" },
  "batch_keyframe_operations": { phase: "animation", stateClass: "animation_motion", defaultStaleScopes: ["ANIMATION_MOTION"], verificationClass: "visual" },
  "bone_rigging": { phase: "geometry", stateClass: "geometry", defaultStaleScopes: ["GEOMETRY_STRUCTURE","ANIMATION_MOTION"], verificationClass: "focused_read", aliases: ["inverse kinematics","ik target","ik controller","ik root","ik source","ik pole","pole vector","mirror bone","rig mirror"] },
  "bulk_set_material_instances": { phase: "texturing", stateClass: "material_render", defaultStaleScopes: ["MATERIAL_RENDER"], verificationClass: "focused_read" },
  "capture_model_views": { tier: "primary", phase: "core", executionClass: "heavy", verificationClass: "visual" },
  "clear_material_instances": { phase: "texturing", stateClass: "material_render", defaultStaleScopes: ["MATERIAL_RENDER"], verificationClass: "focused_read" },
  "color_picker_tool": { phase: "texturing" },
  "configure_material": { phase: "texturing", stateClass: "material_render", defaultStaleScopes: ["MATERIAL_RENDER"], verificationClass: "focused_read" },
  "copy_brush_tool": { tier: "primary", phase: "texturing", stateClass: "texture_appearance", defaultStaleScopes: ["TEXTURE_APPEARANCE"], verificationClass: "visual" },
  "create_animation": { tier: "primary", phase: "animation", stateClass: "animation_motion", defaultStaleScopes: ["ANIMATION_MOTION"], verificationClass: "visual" },
  "create_brush_preset": { phase: "texturing" },
  "create_pbr_material": { phase: "texturing", stateClass: "material_render", defaultStaleScopes: ["MATERIAL_RENDER"], verificationClass: "focused_read" },
  "create_project": { phase: "core", stateClass: "cross_authoring", defaultStaleScopes: ["GEOMETRY_STRUCTURE","UV_MAPPING","TEXTURE_APPEARANCE","MATERIAL_RENDER","ANIMATION_MOTION","ANIMATION_CONTROLLER","ANIMATION_EFFECTS","PARTICLE_SYSTEM"], verificationClass: "focused_read", effects: {projectAffinity: "adopt_created_project",phaseAffinity: "preserve",invalidateCatalog: true} },
  "create_texture": { tier: "primary", phase: "texturing", stateClass: "texture_appearance", defaultStaleScopes: ["TEXTURE_APPEARANCE"], verificationClass: "visual" },
  "draw_shape_tool": { tier: "primary", phase: "texturing", stateClass: "texture_appearance", defaultStaleScopes: ["TEXTURE_APPEARANCE"], verificationClass: "visual" },
  "duplicate_element": { phase: "geometry", stateClass: "geometry", defaultStaleScopes: ["GEOMETRY_STRUCTURE","UV_MAPPING","TEXTURE_APPEARANCE","ANIMATION_MOTION"], verificationClass: "visual" },
  "emulate_clicks": { tier: "maintenance" },
  "eraser_tool": { tier: "primary", phase: "texturing", stateClass: "texture_appearance", defaultStaleScopes: ["TEXTURE_APPEARANCE"], verificationClass: "visual" },
  "export_model": { tier: "primary", phase: "core", executionClass: "heavy" },
  "fill_dialog": { tier: "maintenance" },
  "filter_by_material": { phase: "texturing" },
  "from_geo_json": { tier: "maintenance" },
  "get_face_material_instances": { phase: "texturing" },
  "get_material_info": { phase: "texturing" },
  "get_project_info": { tier: "primary", phase: "core", executionClass: "fast" },
  "get_selection": { phase: "geometry" },
  "get_texture": { tier: "primary", phase: "texturing", executionClass: "fast" },
  "get_undo_stack": { phase: "core", executionClass: "fast" },
  "gradient_tool": { tier: "primary", phase: "texturing", stateClass: "texture_appearance", defaultStaleScopes: ["TEXTURE_APPEARANCE"], verificationClass: "visual" },
  "import_texture_set": { phase: "texturing", stateClass: "texture_material", defaultStaleScopes: ["TEXTURE_APPEARANCE","MATERIAL_RENDER"], verificationClass: "focused_read" },
  "inspect_animation": { tier: "primary", phase: "animation", executionClass: "fast" },
  "inspect_elements": { tier: "primary", phase: "core", executionClass: "fast" },
  "inspect_model_bounds": { phase: "core" },
  "inspect_particle": { tier: "primary", phase: "animation", executionClass: "fast", aliases: ["inspect particle","particle emitter","snowstorm particle","particle molang"] },
  "list_material_instances": { phase: "texturing" },
  "list_materials": { phase: "texturing" },
  "list_textures": { tier: "primary", phase: "core", executionClass: "fast" },
  "load_brush_preset": { phase: "texturing" },
  "manage_animation_controller": { tier: "primary", phase: "animation", stateClass: "animation_controller", defaultStaleScopes: ["ANIMATION_CONTROLLER"], verificationClass: "focused_read", aliases: ["state machine","nested controller","blend curve","transition curve","controller animasi","state animasi","transisi animasi"] },
  "manage_animation_effects": { tier: "primary", phase: "animation", stateClass: "animation_effects", defaultStaleScopes: ["ANIMATION_EFFECTS"], verificationClass: "focused_read", aliases: ["animation sound","animation particle","animation timeline event","suara animasi","particle animasi","efek animasi"] },
  "manage_animation_timeline": { tier: "primary", phase: "animation", stateClass: "animation_motion", defaultStaleScopes: ["ANIMATION_MOTION"], verificationClass: "visual", aliases: ["animation properties","native animation properties","animation molang","rotation space","tambah keyframe","ubah keyframe","atur timeline animasi"] },
  "manage_cubes": { tier: "primary", phase: "geometry", stateClass: "geometry", defaultStaleScopes: ["GEOMETRY_STRUCTURE","UV_MAPPING","TEXTURE_APPEARANCE","ANIMATION_MOTION"], verificationClass: "visual", aliases: ["geometry create","create cube","create cubes","cube batch","bedrock geometry","geometry batch","buat kubus","ubah ukuran kubus","geser kubus"] },
  "manage_keyframes": { phase: "animation", stateClass: "animation_motion", defaultStaleScopes: ["ANIMATION_MOTION"], verificationClass: "visual" },
  "manage_locator": { tier: "primary", phase: "geometry", stateClass: "geometry", defaultStaleScopes: ["GEOMETRY_STRUCTURE","ANIMATION_EFFECTS"], verificationClass: "focused_read", aliases: ["locator","attachment point","socket","anchor point","titik attachment","titik pegangan"] },
  "manage_material": { tier: "primary", phase: "texturing", stateClass: "material_render", defaultStaleScopes: ["MATERIAL_RENDER"], verificationClass: "focused_read" },
  "manage_material_instances": { tier: "primary", phase: "texturing", stateClass: "material_render", defaultStaleScopes: ["MATERIAL_RENDER"], verificationClass: "focused_read" },
  "manage_null_object": { phase: "geometry", stateClass: "geometry", defaultStaleScopes: ["GEOMETRY_STRUCTURE","ANIMATION_MOTION"], verificationClass: "focused_read" },
  "manage_particle": { tier: "primary", phase: "animation", stateClass: "particle", defaultStaleScopes: ["PARTICLE_SYSTEM"], verificationClass: "focused_read", aliases: ["particle emitter","bedrock particle","snowstorm","particle molang","buat particle","ubah particle","asap particle"] },
  "manage_render_profile": { tier: "primary", phase: "texturing", stateClass: "material_render", defaultStaleScopes: ["MATERIAL_RENDER"], verificationClass: "focused_read", aliases: ["alpha cutout translucent","render material","entity alphatest alphablend emissive"] },
  "manage_uv_layout": { tier: "primary", phase: "texturing", stateClass: "uv", defaultStaleScopes: ["UV_MAPPING","TEXTURE_APPEARANCE"], verificationClass: "visual", aliases: ["uv layout","uv pack","uv mapping","texel density","repack uv","pack islands","atur uv","rapikan uv"] },
  "modify_group": { tier: "primary", phase: "geometry", stateClass: "geometry", defaultStaleScopes: ["GEOMETRY_STRUCTURE","ANIMATION_MOTION"], verificationClass: "focused_read", aliases: ["set pivot","bone pivot","group pivot","move group","translate group","ubah pivot","geser tulang","ubah posisi bone"] },
  "paint_fill_tool": { tier: "primary", phase: "texturing", stateClass: "texture_appearance", defaultStaleScopes: ["TEXTURE_APPEARANCE"], verificationClass: "visual" },
  "paint_settings": { phase: "texturing" },
  "paint_texture_transaction": { tier: "primary", phase: "texturing", stateClass: "texture_appearance", defaultStaleScopes: ["TEXTURE_APPEARANCE"], executionClass: "heavy", verificationClass: "visual", aliases: ["atomic paint","exact pixel","exact pixels","revision protected paint","cat pixel tepat","ubah pixel persis","edit pixel presisi"] },
  "paint_with_brush": { tier: "primary", phase: "texturing", stateClass: "texture_appearance", defaultStaleScopes: ["TEXTURE_APPEARANCE"], verificationClass: "visual" },
  "redo": { tier: "primary", phase: "core", stateClass: "cross_authoring", defaultStaleScopes: ["GEOMETRY_STRUCTURE","UV_MAPPING","TEXTURE_APPEARANCE","MATERIAL_RENDER","ANIMATION_MOTION","ANIMATION_CONTROLLER","ANIMATION_EFFECTS","PARTICLE_SYSTEM"], verificationClass: "visual" },
  "remove_element": { tier: "primary", phase: "geometry", stateClass: "geometry", defaultStaleScopes: ["GEOMETRY_STRUCTURE","UV_MAPPING","TEXTURE_APPEARANCE","ANIMATION_MOTION"], verificationClass: "focused_read" },
  "rename_element": { tier: "primary", phase: "geometry", stateClass: "geometry", defaultStaleScopes: ["GEOMETRY_STRUCTURE","ANIMATION_MOTION"], verificationClass: "focused_read" },
  "reparent_element": { tier: "primary", phase: "geometry", stateClass: "geometry", defaultStaleScopes: ["GEOMETRY_STRUCTURE","ANIMATION_MOTION"], verificationClass: "focused_read", aliases: ["parent bone","unparent bone","reparent bone","move parent","change parent"] },
  "risky_eval": { tier: "maintenance" },
  "save_material_config": { phase: "texturing", stateClass: "persistence", defaultStaleScopes: [], verificationClass: "focused_read" },
  "select_all_of_type": { phase: "geometry" },
  "set_face_material_instance": { phase: "texturing", stateClass: "material_render", defaultStaleScopes: ["MATERIAL_RENDER"], verificationClass: "focused_read" },
  "switch_authoring_phase": { tier: "primary", phase: "core", verificationClass: "focused_read", effects: {projectAffinity: "preserve",phaseAffinity: "update_from_result",invalidateCatalog: true} },
  "texture_layer_management": { tier: "primary", phase: "texturing", stateClass: "texture_appearance", defaultStaleScopes: ["TEXTURE_APPEARANCE"], verificationClass: "visual" },
  "texture_selection": { phase: "texturing" },
  "trigger_action": { tier: "maintenance" },
  "undo": { tier: "primary", phase: "core", stateClass: "cross_authoring", defaultStaleScopes: ["GEOMETRY_STRUCTURE","UV_MAPPING","TEXTURE_APPEARANCE","MATERIAL_RENDER","ANIMATION_MOTION","ANIMATION_CONTROLLER","ANIMATION_EFFECTS","PARTICLE_SYSTEM"], verificationClass: "visual" },
} as const satisfies Readonly<Record<string, CapabilityCoreManifestEntry>>;

export const CAPABILITY_CORE_MANIFEST: ReadonlyMap<
  string,
  CapabilityCoreManifestEntry
> = new Map(Object.entries(CAPABILITY_DEFINITIONS));

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

export function capabilitiesByStateClass(
  ...classes: readonly CapabilityStateClass[]
): string[] {
  const wanted = new Set(classes);
  return [...CAPABILITY_CORE_MANIFEST.entries()]
    .filter(([, entry]) => entry.stateClass && wanted.has(entry.stateClass))
    .map(([name]) => name)
    .sort((a, b) => a.localeCompare(b));
}

export function capabilityDefaultStaleScopes(
  name: string
): CapabilitySemanticScope[] {
  return [...(CAPABILITY_CORE_MANIFEST.get(name)?.defaultStaleScopes ?? [])];
}
