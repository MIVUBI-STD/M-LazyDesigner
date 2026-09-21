import type {
  CapabilityBranchHint,
  CapabilityFact,
} from "./types";

export type {
  CapabilityBranchHint,
  CapabilityFact,
} from "./types";

export type CapabilitySemanticSpec = {
  intents: readonly string[];
  nouns?: readonly string[];
  verbs?: readonly string[];
  excludes?: readonly string[];
  examples?: readonly string[];
};

export type CapabilityGraphSpec = {
  requires?: readonly CapabilityFact[];
  produces?: readonly CapabilityFact[];
  invalidates?: readonly CapabilityFact[];
  predecessor?: {
    capability: string;
    branch?: CapabilityBranchHint;
  };
};

export type CapabilityBranchManifestEntry = {
  capability: string;
  branch?: CapabilityBranchHint;
  schemaFields?: readonly string[];
  semantic?: CapabilitySemanticSpec;
  graph?: CapabilityGraphSpec;
};

/**
 * Canonical branch-level capability semantics.
 *
 * This owns branch identity once and projects it into:
 * - Gateway semantic retrieval;
 * - precondition/effect graph;
 * - deferred schema projection.
 *
 * Runtime executor schemas remain authoritative for validation.
 */
export const CAPABILITY_BRANCH_MANIFEST: readonly CapabilityBranchManifestEntry[] = [
  {
    capability: "manage_cubes",
    branch: { field: "operation", value: "create" },
    schemaFields: ["operation"],
    semantic: {
      intents: ["create cube geometry", "build model part", "add cuboid"],
      nouns: ["cube", "geometry", "body", "part", "limb", "block"],
      verbs: ["create", "add", "build", "make"],
      excludes: ["texture", "uv", "animation"],
      examples: ["make four table legs", "add a cube for the head"],
    },
    graph: {
      requires: ["project_bound"],
      produces: ["geometry_available"],
      invalidates: [
        "uv_plan_available",
        "uv_layout_current",
        "texture_alignment_current",
        "visual_evidence_current",
      ],
    },
  },
  {
    capability: "manage_cubes",
    branch: { field: "operation", value: "update" },
    schemaFields: ["operation"],
    semantic: {
      intents: [
        "adjust proportions",
        "resize existing geometry",
        "move cube",
        "rotate cube",
        "correct model shape",
      ],
      nouns: ["cube", "geometry", "part", "body", "limb", "leg", "head"],
      verbs: [
        "resize",
        "adjust",
        "lengthen",
        "shorten",
        "move",
        "rotate",
        "scale",
        "thicken",
        "narrow",
      ],
      excludes: ["reparent", "rename", "uv", "texture"],
      examples: ["make the chair leg taller", "reduce the head width"],
    },
    graph: {
      requires: ["project_bound", "geometry_available"],
      produces: ["geometry_available"],
      invalidates: [
        "uv_plan_available",
        "uv_layout_current",
        "texture_alignment_current",
        "visual_evidence_current",
      ],
    },
  },
  {
    capability: "manage_cubes",
    branch: { field: "operation", value: "batch_update" },
    schemaFields: ["operation"],
    semantic: {
      intents: ["edit many cubes", "batch geometry correction", "repeat geometry changes"],
      nouns: ["cubes", "geometry", "parts"],
      verbs: ["batch", "multiple", "all", "several", "repeat"],
    },
    graph: {
      requires: ["project_bound", "geometry_available"],
      produces: ["geometry_available"],
      invalidates: [
        "uv_plan_available",
        "uv_layout_current",
        "texture_alignment_current",
        "visual_evidence_current",
      ],
    },
  },
  {
    capability: "manage_cubes",
    branch: { field: "operation", value: "simplify" },
    schemaFields: ["operation"],
    semantic: {
      intents: ["simplify geometry", "reduce cube complexity", "clean geometry"],
      nouns: ["geometry", "cube", "model"],
      verbs: ["simplify", "reduce", "clean", "optimize"],
    },
    graph: {
      requires: ["project_bound", "geometry_available"],
      produces: ["geometry_available"],
      invalidates: [
        "uv_plan_available",
        "uv_layout_current",
        "texture_alignment_current",
        "visual_evidence_current",
      ],
    },
  },

  {
    capability: "inspect_elements",
    branch: { field: "mode", value: "outline" },
    schemaFields: ["mode", "include_cubes", "max_depth", "max_nodes"],
  },
  {
    capability: "inspect_elements",
    branch: { field: "mode", value: "search" },
    schemaFields: [
      "mode",
      "name_pattern",
      "name_contains",
      "type",
      "parent_group",
      "min_size",
      "max_size",
      "selected_only",
      "limit",
    ],
    semantic: {
      intents: ["find model element", "locate cube or group", "search hierarchy"],
      nouns: ["cube", "group", "bone", "element", "part"],
      verbs: ["find", "search", "locate", "identify"],
    },
  },
  {
    capability: "inspect_elements",
    branch: { field: "mode", value: "detail" },
    schemaFields: ["mode", "id", "detail"],
    semantic: {
      intents: ["inspect exact element", "read element dimensions", "inspect cube state"],
      nouns: ["cube", "group", "bone", "element", "part"],
      verbs: ["inspect", "check", "read", "measure"],
    },
  },

  {
    capability: "manage_uv_layout",
    branch: { field: "operation", value: "plan" },
    schemaFields: [
      "operation",
      "bitmap_width",
      "bitmap_height",
      "mode",
      "island_ids",
      "default_target_pixels_per_model_unit",
      "constraints",
      "include_implicit_stack_candidates",
    ],
    semantic: {
      intents: ["plan uv layout", "pack uv islands", "fix uv overlap", "set texel density"],
      nouns: ["uv", "island", "atlas", "texel", "padding"],
      verbs: ["plan", "pack", "repack", "arrange", "layout"],
      examples: ["pack the UV islands without overlap"],
    },
    graph: {
      requires: ["project_bound", "geometry_available"],
      produces: ["uv_plan_available"],
    },
  },
  {
    capability: "manage_uv_layout",
    branch: { field: "operation", value: "apply" },
    schemaFields: ["operation", "plan_id", "expected_source_fingerprint"],
    semantic: {
      intents: ["apply uv plan", "commit uv layout"],
      nouns: ["uv", "layout", "plan"],
      verbs: ["apply", "commit", "use"],
    },
    graph: {
      requires: ["project_bound", "geometry_available", "uv_plan_available"],
      produces: ["uv_layout_current"],
      invalidates: ["texture_alignment_current", "visual_evidence_current"],
      predecessor: {
        capability: "manage_uv_layout",
        branch: { field: "operation", value: "plan" },
      },
    },
  },

  {
    capability: "create_texture",
    branch: { field: "type", value: "blank" },
    schemaFields: [
      "type", "name", "width", "height", "data", "group", "fill_color",
      "layer_name", "pbr_channel", "render_mode", "render_sides",
    ],
    semantic: {
      intents: ["create blank texture", "new empty texture"],
      nouns: ["texture", "image", "atlas"],
      verbs: ["create", "new", "blank"],
    },
    graph: {
      requires: ["project_bound"],
      produces: ["texture_available"],
      invalidates: ["visual_evidence_current"],
    },
  },
  {
    capability: "create_texture",
    branch: { field: "type", value: "template" },
    schemaFields: [
      "type", "name", "texture_id", "width", "height", "pixel_density",
      "rearrange_uv", "power_of_two", "keep_multi_texture_occupancy",
      "padding", "group", "fill_color", "layer_name", "pbr_channel",
      "render_mode", "render_sides",
    ],
    semantic: {
      intents: ["create texture from template", "generate texture atlas from model"],
      nouns: ["texture", "template", "atlas"],
      verbs: ["create", "generate", "template"],
    },
    graph: {
      requires: ["project_bound", "geometry_available"],
      produces: ["texture_available"],
      invalidates: ["visual_evidence_current"],
    },
  },
  {
    capability: "create_texture",
    branch: { field: "type", value: "variant" },
    schemaFields: ["type", "name", "source_texture_id", "group"],
    semantic: {
      intents: ["create texture variant", "duplicate texture variant"],
      nouns: ["texture", "variant"],
      verbs: ["variant", "duplicate", "derive"],
    },
    graph: {
      requires: ["project_bound", "texture_available"],
      produces: ["texture_available"],
      invalidates: ["visual_evidence_current"],
      predecessor: {
        capability: "create_texture",
        branch: { field: "type", value: "blank" },
      },
    },
  },

  {
    capability: "manage_material",
    branch: { field: "operation", value: "create" },
    schemaFields: [
      "operation", "name", "color_texture", "normal_texture", "height_texture",
      "mer_texture", "color_value", "mer_value", "subsurface_value",
    ],
    semantic: {
      intents: ["create pbr material", "new material"],
      nouns: ["material", "pbr", "normal", "mer", "height"],
      verbs: ["create", "new"],
    },
    graph: {
      requires: ["project_bound"],
      produces: ["material_available"],
    },
  },
  {
    capability: "manage_material",
    branch: { field: "operation", value: "configure" },
    schemaFields: [
      "operation", "material", "color_texture", "normal_texture", "height_texture",
      "mer_texture", "color_value", "mer_value", "subsurface_value",
    ],
    semantic: {
      intents: ["configure material", "change pbr channels", "edit material"],
      nouns: ["material", "pbr", "normal", "mer", "height"],
      verbs: ["configure", "edit", "change", "adjust"],
    },
    graph: {
      requires: ["project_bound", "material_available"],
      produces: ["material_available"],
    },
  },
  {
    capability: "manage_material",
    branch: { field: "operation", value: "assign_channel" },
    schemaFields: ["operation", "material", "texture", "channel"],
  },
  {
    capability: "manage_material",
    branch: { field: "operation", value: "save" },
    schemaFields: ["operation", "material"],
  },

  {
    capability: "manage_material_instances",
    branch: { field: "operation", value: "list" },
    schemaFields: ["operation", "include_usages", "usage_limit_per_instance"],
  },
  {
    capability: "manage_material_instances",
    branch: { field: "operation", value: "get" },
    schemaFields: ["operation", "cube_id", "faces"],
  },
  {
    capability: "manage_material_instances",
    branch: { field: "operation", value: "set" },
    schemaFields: ["operation", "cube_id", "material_name", "faces"],
  },
  {
    capability: "manage_material_instances",
    branch: { field: "operation", value: "bulk_set" },
    schemaFields: ["operation", "assignments"],
  },
  {
    capability: "manage_material_instances",
    branch: { field: "operation", value: "clear" },
    schemaFields: ["operation", "cube_id", "faces", "all_cubes"],
  },

  ...["inspect", "bind", "set_slot", "assign", "unassign"].map((value) => ({
    capability: "manage_render_profile",
    branch: { field: "operation", value },
    schemaFields: ["operation"],
    ...(value === "bind"
      ? {
          semantic: {
            intents: ["bind render profile", "set render material profile"],
            nouns: ["render", "profile", "material", "alpha"],
            verbs: ["bind", "set", "configure"],
          },
        }
      : {}),
  })),

  {
    capability: "manage_animation_timeline",
    branch: { field: "operation", value: "keyframes" },
    schemaFields: ["operation", "animation_id", "action", "bone_name", "channel", "keyframes"],
  },
  {
    capability: "manage_animation_timeline",
    branch: { field: "operation", value: "graph" },
    schemaFields: ["operation", "animation_id", "bone_name", "channel", "axis", "action", "keyframe_range", "custom_curve"],
  },
  {
    capability: "manage_animation_timeline",
    branch: { field: "operation", value: "timeline" },
    schemaFields: ["operation", "animation_id", "action", "time", "length", "fps", "loop_mode", "range", "molang", "easing", "bone_ids"],
  },
  {
    capability: "manage_animation_timeline",
    branch: { field: "operation", value: "batch" },
    schemaFields: ["operation", "animation_id", "batch_operation", "selection", "range", "pattern", "parameters"],
  },
  {
    capability: "manage_animation_timeline",
    branch: { field: "operation", value: "copy_paste" },
    schemaFields: ["operation", "action", "source", "target"],
  },
  {
    capability: "manage_animation_timeline",
    branch: { field: "operation", value: "properties" },
    schemaFields: [
      "operation", "animation_id", "length", "fps", "loop_mode",
      "anim_time_update", "blend_weight", "start_delay", "loop_delay",
      "override_previous_animation", "rotation_spaces",
    ],
  },

  {
    capability: "manage_animation_controller",
    branch: { field: "resource_kind", value: "client_entity" },
    schemaFields: [
      "resource_kind", "resource_source", "resource_output",
      "resource_operations", "max_content_length",
    ],
  },
  {
    capability: "manage_animation_controller",
    branch: { field: "resource_kind", value: "animation_controller" },
    schemaFields: [
      "resource_kind", "resource_source", "resource_output",
      "resource_controller", "resource_operations", "max_content_length",
    ],
  },

  {
    capability: "gradient_tool",
    semantic: {
      intents: ["paint gradient", "shade with gradient", "automatic color transition"],
      nouns: ["texture", "gradient", "color", "shade"],
      verbs: ["gradient", "shade", "blend", "transition"],
    },
    graph: {
      requires: ["project_bound", "texture_available"],
      produces: ["texture_available"],
      invalidates: ["visual_evidence_current"],
    },
  },
  {
    capability: "paint_texture_transaction",
    semantic: {
      intents: ["exact pixel edit", "atomic texture edit", "revision protected paint"],
      nouns: ["texture", "pixel", "pixels"],
      verbs: ["paint", "edit", "replace", "set"],
    },
    graph: {
      requires: ["project_bound", "texture_available"],
      produces: ["texture_available"],
      invalidates: ["visual_evidence_current"],
    },
  },
  {
    capability: "paint_with_brush",
    semantic: {
      intents: ["paint texture with brush", "brush stroke", "manual texture stroke"],
      nouns: ["texture", "brush", "stroke", "paint"],
      verbs: ["paint", "brush", "draw"],
    },
    graph: {
      requires: ["project_bound", "texture_available"],
      produces: ["texture_available"],
      invalidates: ["visual_evidence_current"],
    },
  },
  {
    capability: "create_animation",
    semantic: {
      intents: ["create animation", "new animation", "add animation clip"],
      nouns: ["animation", "clip"],
      verbs: ["create", "new", "add"],
    },
    graph: {
      requires: ["project_bound", "geometry_available"],
      produces: ["animation_available"],
    },
  },
  {
    capability: "manage_animation_timeline",
    semantic: {
      intents: ["edit keyframe", "animation timeline", "change easing", "bone animation"],
      nouns: ["animation", "timeline", "keyframe", "easing", "bone"],
      verbs: ["edit", "add", "change", "animate"],
    },
    graph: {
      requires: ["project_bound", "animation_available"],
      produces: ["animation_available"],
      invalidates: ["visual_evidence_current"],
    },
  },
  {
    capability: "manage_animation_effects",
    semantic: {
      intents: ["add animation sound", "add animation particle", "timeline event"],
      nouns: ["animation", "sound", "particle", "effect", "event"],
      verbs: ["add", "edit", "trigger"],
    },
    graph: {
      requires: ["project_bound", "animation_available"],
      produces: ["animation_available"],
    },
  },
  {
    capability: "manage_animation_controller",
    semantic: {
      intents: ["edit animation controller", "state machine", "animation transition"],
      nouns: ["controller", "state", "transition", "animation"],
      verbs: ["create", "edit", "transition", "blend"],
    },
    graph: {
      requires: ["project_bound", "animation_available"],
      produces: ["animation_available"],
    },
  },
  {
    capability: "inspect_particle",
    semantic: {
      intents: ["inspect particle", "read particle emitter"],
      nouns: ["particle", "emitter"],
      verbs: ["inspect", "read", "check"],
    },
    graph: {
      requires: ["project_bound", "particle_available"],
    },
  },
  {
    capability: "manage_particle",
    semantic: {
      intents: ["create particle", "edit particle emitter", "change particle"],
      nouns: ["particle", "emitter", "snowstorm"],
      verbs: ["create", "edit", "change", "configure"],
    },
    graph: {
      requires: ["project_bound"],
      produces: ["particle_available"],
      invalidates: ["visual_evidence_current"],
    },
  },
  {
    capability: "capture_model_views",
    semantic: {
      intents: ["capture model view", "visual verification", "take preview", "inspect appearance"],
      nouns: ["model", "view", "preview", "image", "camera"],
      verbs: ["capture", "preview", "verify", "see"],
    },
    graph: {
      requires: ["project_bound", "geometry_available"],
      produces: ["visual_evidence_current"],
    },
  },
  {
    capability: "inspect_model_bounds",
    semantic: {
      intents: ["measure model bounds", "check total size", "inspect dimensions"],
      nouns: ["model", "bounds", "size", "dimensions"],
      verbs: ["measure", "check", "inspect"],
    },
  },
  {
    capability: "reparent_element",
    semantic: {
      intents: ["change hierarchy parent", "move element to bone", "reparent bone"],
      nouns: ["parent", "bone", "group", "hierarchy", "element"],
      verbs: ["reparent", "parent", "unparent", "move"],
      excludes: [
        "resize",
        "texture",
        "position",
        "translate",
        "shift",
        "rotation",
        "scale",
        "pivot",
      ],
    },
  },
  {
    capability: "modify_group",
    semantic: {
      intents: ["adjust bone pivot", "move group", "edit group transform"],
      nouns: ["group", "bone", "pivot"],
      verbs: ["pivot", "move", "adjust", "modify"],
      excludes: ["cube", "cuboid", "texture", "reparent", "parent"],
    },
  },
];

export function manifestEntriesForCapability(
  capability: string
): readonly CapabilityBranchManifestEntry[] {
  return CAPABILITY_BRANCH_MANIFEST.filter(
    (entry) => entry.capability === capability
  );
}

export function manifestEntryForBranch(
  capability: string,
  branch?: CapabilityBranchHint
): CapabilityBranchManifestEntry | null {
  const entries = manifestEntriesForCapability(capability);
  if (branch) {
    const exact = entries.find(
      (entry) =>
        entry.branch?.field === branch.field &&
        entry.branch.value === branch.value
    );
    if (exact) return exact;
  }
  return entries.find((entry) => entry.branch === undefined) ?? null;
}
