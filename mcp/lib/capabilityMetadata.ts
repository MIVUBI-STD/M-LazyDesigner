export type CapabilityTier =
  | "primary"
  | "support"
  | "experimental"
  | "maintenance";

export type CapabilityEffects = {
  projectAffinity: "preserve" | "adopt_created_project";
  phaseAffinity: "preserve" | "update_from_result";
  invalidateCatalog: boolean;
};

export type CapabilityLifecycleStage = "active" | "deprecated";
export type CapabilityExecutionClass = "fast" | "normal" | "heavy";
export type CapabilityVerificationClass =
  | "not_applicable"
  | "receipt_only"
  | "focused_read"
  | "visual";

export type CapabilityLifecycle = {
  stage: CapabilityLifecycleStage;
  replacement: string | null;
};

export type CapabilityMetadata = {
  tier: CapabilityTier;
  searchAliases: readonly string[];
  effects: CapabilityEffects;
  lifecycle: CapabilityLifecycle;
  executionClass: CapabilityExecutionClass;
  verificationClass: CapabilityVerificationClass;
};

const PRIMARY_CAPABILITIES = new Set([
  "get_project_info",
  "inspect_elements",
  "capture_model_views",
  "export_model",
  "undo",
  "redo",
  "switch_authoring_phase",
  "manage_cubes",
  "add_group",
  "modify_group",
  "reparent_element",
  "remove_element",
  "rename_element",
  "manage_locator",
  "create_texture",
  "list_textures",
  "get_texture",
  "paint_fill_tool",
  "draw_shape_tool",
  "paint_with_brush",
  "eraser_tool",
  "paint_texture_transaction",
  "manage_material",
  "manage_material_instances",
  "manage_render_profile",
  "create_animation",
  "inspect_animation",
  "manage_animation_timeline",
  "manage_animation_effects",
  "manage_animation_controller",
  "inspect_particle",
  "manage_particle",
]);

// Keep the tier available for future bounded experiments, but do not retain
// retired capability names as active metadata.
const EXPERIMENTAL_CAPABILITIES = new Set<string>();

const MAINTENANCE_CAPABILITIES = new Set([
  "trigger_action",
  "emulate_clicks",
  "fill_dialog",
  "risky_eval",
  "from_geo_json",
]);

const SEARCH_ALIASES: Readonly<Record<string, readonly string[]>> = {
  manage_cubes: [
    "geometry create",
    "create cube",
    "create cubes",
    "cube batch",
    "bedrock geometry",
    "geometry batch",
    "buat kubus",
    "ubah ukuran kubus",
    "geser kubus",
  ],
  add_group: [
    "create bone",
    "create bones",
    "add bone",
    "add bones",
    "group batch",
    "bone batch",
  ],
  modify_group: [
    "set pivot",
    "bone pivot",
    "group pivot",
    "move group",
    "translate group",
    "ubah pivot",
    "geser tulang",
    "ubah posisi bone",
  ],
  reparent_element: [
    "parent bone",
    "unparent bone",
    "reparent bone",
    "move parent",
    "change parent",
  ],
  manage_locator: [
    "locator",
    "attachment point",
    "socket",
    "anchor point",
    "titik attachment",
    "titik pegangan",
  ],
  bone_rigging: [
    "inverse kinematics",
    "ik target",
    "mirror bone",
    "rig mirror",
  ],
  apply_texture: [
    "assign texture",
    "texture cube",
    "texture face",
    "map texture",
  ],
  paint_texture_transaction: [
    "atomic paint",
    "exact pixel",
    "exact pixels",
    "revision protected paint",
    "cat pixel tepat",
    "ubah pixel persis",
    "edit pixel presisi",
  ],
  manage_render_profile: [
    "alpha cutout translucent",
    "render material",
    "entity alphatest alphablend emissive",
  ],
  manage_animation_timeline: [
    "animation properties",
    "native animation properties",
    "animation molang",
    "rotation space",
    "tambah keyframe",
    "ubah keyframe",
    "atur timeline animasi",
  ],
  manage_animation_controller: [
    "state machine",
    "nested controller",
    "blend curve",
    "transition curve",
    "controller animasi",
    "state animasi",
    "transisi animasi",
  ],
  manage_animation_effects: [
    "animation sound",
    "animation particle",
    "animation timeline event",
    "suara animasi",
    "particle animasi",
    "efek animasi",
  ],
  inspect_particle: [
    "inspect particle",
    "particle emitter",
    "snowstorm particle",
    "particle molang",
  ],
  manage_particle: [
    "particle emitter",
    "bedrock particle",
    "snowstorm",
    "particle molang",
    "buat particle",
    "ubah particle",
    "asap particle",
  ],
};

const DEFAULT_EFFECTS: CapabilityEffects = {
  projectAffinity: "preserve",
  phaseAffinity: "preserve",
  invalidateCatalog: false,
};

const DEFAULT_LIFECYCLE: CapabilityLifecycle = {
  stage: "active",
  replacement: null,
};

// Keep deprecation explicit instead of deriving it from maintenance/support
// tiering. A deprecated capability remains callable until a separately planned
// compatibility removal proves that no supported consumer still needs it.
const CAPABILITY_LIFECYCLE: Readonly<Record<string, CapabilityLifecycle>> = {};

const FAST_CAPABILITIES = new Set([
  "get_project_info",
  "inspect_elements",
  "list_textures",
  "get_texture",
  "inspect_animation",
  "inspect_particle",
  "get_undo_stack",
]);

const HEAVY_CAPABILITIES = new Set([
  "capture_model_views",
  "paint_texture_transaction",
  "export_model",
]);

const RECEIPT_ONLY_CAPABILITIES = new Set([
  "create_project",
  "rename_element",
  "switch_authoring_phase",
]);

const FOCUSED_READ_VERIFICATION_CAPABILITIES = new Set([
  "create_project",
  "add_group",
  "modify_group",
  "reparent_element",
  "remove_element",
  "rename_element",
  "manage_locator",
  "manage_null_object",
  "manage_material",
  "manage_material_instances",
  "manage_render_profile",
  "manage_animation_controller",
  "manage_animation_effects",
  "manage_particle",
]);

function executionClassFor(name: string): CapabilityExecutionClass {
  if (FAST_CAPABILITIES.has(name)) return "fast";
  if (HEAVY_CAPABILITIES.has(name)) return "heavy";
  return "normal";
}

const VISUAL_VERIFICATION_CAPABILITIES = new Set([
  "manage_cubes",
  "capture_model_views",
  "create_texture",
  "paint_fill_tool",
  "draw_shape_tool",
  "paint_with_brush",
  "eraser_tool",
  "paint_texture_transaction",
  "create_animation",
  "manage_animation_timeline",
  "undo",
  "redo",
]);

function verificationClassFor(name: string): CapabilityVerificationClass {
  if (RECEIPT_ONLY_CAPABILITIES.has(name)) return "receipt_only";
  if (FOCUSED_READ_VERIFICATION_CAPABILITIES.has(name)) return "focused_read";
  if (VISUAL_VERIFICATION_CAPABILITIES.has(name)) return "visual";
  return "not_applicable";
}

const CAPABILITY_EFFECTS: Readonly<Record<string, CapabilityEffects>> = {
  create_project: {
    projectAffinity: "adopt_created_project",
    phaseAffinity: "preserve",
    invalidateCatalog: true,
  },
  switch_authoring_phase: {
    projectAffinity: "preserve",
    phaseAffinity: "update_from_result",
    // Keep catalog invalidation conservative until same-surface transport reuse
    // is covered by local Gateway/Runtime tests. The Runtime receipt still
    // reports surface_changed so that optimization can be added without
    // changing semantic ownership later.
    invalidateCatalog: true,
  },
};

export const CAPABILITY_TIER_BOOST: Readonly<Record<CapabilityTier, number>> = {
  primary: 20,
  support: 6,
  experimental: 0,
  maintenance: -20,
};

export function getCapabilityMetadata(name: string): CapabilityMetadata {
  const tier: CapabilityTier = MAINTENANCE_CAPABILITIES.has(name)
    ? "maintenance"
    : EXPERIMENTAL_CAPABILITIES.has(name)
      ? "experimental"
      : PRIMARY_CAPABILITIES.has(name)
        ? "primary"
        : "support";

  return {
    tier,
    searchAliases: SEARCH_ALIASES[name] ?? [],
    effects: CAPABILITY_EFFECTS[name] ?? DEFAULT_EFFECTS,
    lifecycle: CAPABILITY_LIFECYCLE[name] ?? DEFAULT_LIFECYCLE,
    executionClass: executionClassFor(name),
    verificationClass: verificationClassFor(name),
  };
}

export const CAPABILITY_LIFECYCLE_SEARCH_PENALTY: Readonly<
  Record<CapabilityLifecycleStage, number>
> = {
  active: 0,
  deprecated: -40,
};
