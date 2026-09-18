import {
  authoringDomainForCapability,
  sourceOwnerForCapability,
} from "./registry";
import type {
  ControlAuthoringDomain,
  ControlDelta,
  ControlFreshnessScope,
} from "./types";
import type { BlockitAuthoringPhaseAffinity } from "../projectAffinity";
import { getCapabilityMetadata } from "../../lib/capabilityMetadata";

const STATE_MUTATIONS = new Set([
  "manage_cubes", "add_group", "modify_group", "duplicate_element", "reparent_element", "remove_element",
  "rename_element", "manage_locator", "manage_null_object", "bone_rigging",
  "create_texture", "add_texture_group", "import_texture_set",
  "paint_fill_tool", "draw_shape_tool", "gradient_tool", "copy_brush_tool",
  "paint_with_brush", "eraser_tool", "texture_layer_management", "paint_texture_transaction",
  "manage_material", "manage_material_instances", "manage_render_profile", "create_animation",
  "manage_animation_timeline", "manage_animation_effects", "manage_animation_controller",
  "manage_particle",
]);

const UV_FIELDS = new Set([
  "faces", "box_uv", "uv_offset", "mirror_uv", "autouv",
]);

const SHAPE_FIELDS = new Set([
  "from", "to", "inflate",
]);

const HIERARCHY_OR_MOTION_STRUCTURE = new Set([
  "add_group", "modify_group", "reparent_element", "rename_element",
  "manage_locator", "manage_null_object", "bone_rigging",
]);

const TEXTURE_APPEARANCE_MUTATIONS = new Set([
  "create_texture", "add_texture_group",
  "paint_fill_tool", "draw_shape_tool", "gradient_tool", "copy_brush_tool",
  "paint_with_brush", "eraser_tool", "texture_layer_management", "paint_texture_transaction",
]);

const MATERIAL_RENDER_MUTATIONS = new Set([
  "manage_material", "manage_material_instances", "manage_render_profile",
]);

const ALL_FRESHNESS_SCOPES: readonly ControlFreshnessScope[] = [
  "GEOMETRY_STRUCTURE",
  "UV_MAPPING",
  "TEXTURE_APPEARANCE",
  "MATERIAL_RENDER",
  "ANIMATION_MOTION",
  "ANIMATION_CONTROLLER",
  "ANIMATION_EFFECTS",
  "PARTICLE_SYSTEM",
];

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function particleTextureHandoffRequired(value: unknown): boolean {
  const root = record(value);
  if (!root) return false;
  const candidates = [root, record(root.structuredContent)].filter(
    (entry): entry is Record<string, unknown> => entry !== null
  );
  return candidates.some((candidate) => {
    const dependency = record(candidate.texture_dependency);
    return dependency?.status === "REQUIRES_TEXTURING";
  });
}

function effectChangedFields(value: unknown): string[] {
  const root = record(value);
  if (!root) return [];
  const fields = new Set<string>();
  const addEffect = (raw: unknown) => {
    const effect = record(raw);
    const geometryEffect = record(effect?.geometry_effect);
    const changed = geometryEffect?.changed_fields;
    if (Array.isArray(changed)) {
      for (const field of changed) if (typeof field === "string") fields.add(field);
    }
  };
  addEffect(root);
  if (Array.isArray(root.effects)) for (const effect of root.effects) addEffect(effect);
  return [...fields];
}

function geometryInvalidation(capability: string, result: unknown): ControlAuthoringDomain[] {
  if (capability === "manage_cubes") {
    const changedFields = effectChangedFields(result);
    if (changedFields.length > 0) {
      if (changedFields.some((field) => UV_FIELDS.has(field) || SHAPE_FIELDS.has(field))) {
        return ["GEOMETRY", "TEXTURING", "ANIMATION"];
      }
      return ["GEOMETRY"];
    }
    return ["GEOMETRY", "TEXTURING", "ANIMATION"];
  }
  if (capability === "remove_element" || capability === "duplicate_element") {
    return ["GEOMETRY", "TEXTURING", "ANIMATION"];
  }
  if (HIERARCHY_OR_MOTION_STRUCTURE.has(capability)) return ["GEOMETRY", "ANIMATION"];
  return ["GEOMETRY"];
}

function mutationInvalidation(
  capability: string,
  domain: ControlAuthoringDomain,
  succeeded: boolean,
  result: unknown
): ControlDelta["invalidates"] {
  const dependencyHandoff =
    capability === "manage_particle" && particleTextureHandoffRequired(result);
  const mutates =
    succeeded && STATE_MUTATIONS.has(capability) && !dependencyHandoff;
  let affectedDomains: ControlAuthoringDomain[] = [];
  if (mutates) {
    if (domain === "GEOMETRY") affectedDomains = geometryInvalidation(capability, result);
    else if (domain === "TEXTURING") affectedDomains = ["TEXTURING"];
    else if (domain === "ANIMATION") affectedDomains = ["ANIMATION"];
    else affectedDomains = ["CORE"];
  }
  return {
    authoring_domains: [...new Set(affectedDomains)],
    workspace_projection: mutates,
    acceptance_gates: mutates,
  };
}

function geometryFreshnessScopes(
  capability: string,
  result: unknown
): { stale: ControlFreshnessScope[]; precise: boolean } {
  if (capability === "manage_cubes") {
    const changedFields = effectChangedFields(result);
    if (changedFields.length === 0) {
      return {
        stale: [
          "GEOMETRY_STRUCTURE",
          "UV_MAPPING",
          "TEXTURE_APPEARANCE",
          "ANIMATION_MOTION",
        ],
        precise: false,
      };
    }

    const stale = new Set<ControlFreshnessScope>(["GEOMETRY_STRUCTURE"]);
    if (changedFields.some((field) => UV_FIELDS.has(field))) {
      stale.add("UV_MAPPING");
      stale.add("TEXTURE_APPEARANCE");
    }
    if (changedFields.some((field) => SHAPE_FIELDS.has(field))) {
      stale.add("UV_MAPPING");
      stale.add("TEXTURE_APPEARANCE");
      stale.add("ANIMATION_MOTION");
    }
    return { stale: [...stale], precise: true };
  }

  if (capability === "remove_element" || capability === "duplicate_element") {
    return {
      stale: [
        "GEOMETRY_STRUCTURE",
        "UV_MAPPING",
        "TEXTURE_APPEARANCE",
        "ANIMATION_MOTION",
      ],
      precise: true,
    };
  }

  if (HIERARCHY_OR_MOTION_STRUCTURE.has(capability)) {
    return {
      stale: ["GEOMETRY_STRUCTURE", "ANIMATION_MOTION"],
      precise: true,
    };
  }

  return { stale: ["GEOMETRY_STRUCTURE"], precise: true };
}

function staleScopesForMutation(
  capability: string,
  domain: ControlAuthoringDomain,
  result: unknown
): { stale: ControlFreshnessScope[]; precise: boolean } {
  if (domain === "GEOMETRY") return geometryFreshnessScopes(capability, result);

  if (domain === "TEXTURING") {
    if (capability === "import_texture_set") {
      return {
        stale: ["TEXTURE_APPEARANCE", "MATERIAL_RENDER"],
        precise: true,
      };
    }
    if (TEXTURE_APPEARANCE_MUTATIONS.has(capability)) {
      return { stale: ["TEXTURE_APPEARANCE"], precise: true };
    }
    if (MATERIAL_RENDER_MUTATIONS.has(capability)) {
      return { stale: ["MATERIAL_RENDER"], precise: true };
    }
    return {
      stale: ["TEXTURE_APPEARANCE", "MATERIAL_RENDER"],
      precise: false,
    };
  }

  if (domain === "ANIMATION") {
    if (capability === "create_animation" || capability === "manage_animation_timeline") {
      return { stale: ["ANIMATION_MOTION"], precise: true };
    }
    if (capability === "manage_animation_controller") {
      return { stale: ["ANIMATION_CONTROLLER"], precise: true };
    }
    if (capability === "manage_animation_effects") {
      return { stale: ["ANIMATION_EFFECTS"], precise: true };
    }
    if (capability === "manage_particle") {
      return { stale: ["PARTICLE_SYSTEM"], precise: true };
    }
    return {
      stale: [
        "ANIMATION_MOTION",
        "ANIMATION_CONTROLLER",
        "ANIMATION_EFFECTS",
        "PARTICLE_SYSTEM",
      ],
      precise: false,
    };
  }

  return { stale: [], precise: false };
}

function mutationFreshness(
  capability: string,
  domain: ControlAuthoringDomain,
  succeeded: boolean,
  result: unknown
): ControlDelta["freshness"] {
  if (!succeeded) {
    return {
      basis: "UNKNOWN_OUTCOME",
      stale: [],
      fresh: [],
      unknown: [...ALL_FRESHNESS_SCOPES],
    };
  }

  const dependencyHandoff =
    capability === "manage_particle" && particleTextureHandoffRequired(result);
  const mutates = STATE_MUTATIONS.has(capability) && !dependencyHandoff;
  if (!mutates) {
    return {
      basis: "NO_CHANGE",
      stale: [],
      fresh: [...ALL_FRESHNESS_SCOPES],
      unknown: [],
    };
  }

  const { stale, precise } = staleScopesForMutation(capability, domain, result);
  const staleSet = new Set(stale);
  return {
    basis: precise ? "PRECISE_EFFECT" : "CONSERVATIVE_EFFECT",
    stale,
    fresh: ALL_FRESHNESS_SCOPES.filter((scope) => !staleSet.has(scope)),
    unknown: [],
  };
}

export function buildControlDelta(input: {
  capability: string;
  phaseBefore: BlockitAuthoringPhaseAffinity | null;
  phaseAfter: BlockitAuthoringPhaseAffinity | null;
  projectUuid: string | null;
  succeeded: boolean;
  result?: unknown;
}): ControlDelta {
  const changed: string[] = [];
  if (input.succeeded && input.phaseBefore !== input.phaseAfter) changed.push("authoring_phase");
  if (input.capability === "create_project" && input.succeeded) changed.push("project_affinity");

  const authoringDomain = authoringDomainForCapability(input.capability);
  const invalidates = mutationInvalidation(input.capability, authoringDomain, input.succeeded, input.result);
  const freshness = mutationFreshness(
    input.capability,
    authoringDomain,
    input.succeeded,
    input.result
  );
  const particleTextureHandoff =
    input.succeeded &&
    input.capability === "manage_particle" &&
    particleTextureHandoffRequired(input.result);
  const nextIntent = !input.succeeded
    ? "RECOVER_CURRENT_OPERATION"
    : particleTextureHandoff
      ? "AUTHOR_PARTICLE_TEXTURE_THEN_RESUME"
      : input.capability === "switch_authoring_phase"
        ? "CONTINUE_NEW_AUTHORING_PHASE"
        : authoringDomain === "GEOMETRY"
          ? "VERIFY_OR_CONTINUE_GEOMETRY"
          : authoringDomain === "TEXTURING"
            ? "VERIFY_OR_CONTINUE_TEXTURING"
            : authoringDomain === "ANIMATION"
              ? "VERIFY_OR_CONTINUE_ANIMATION"
              : "CONTINUE_CURRENT_TASK";

  return {
    protocol: "lazydesigner-control-v1",
    capability: input.capability,
    authoring_domain: authoringDomain,
    source_owner: sourceOwnerForCapability(input.capability),
    phase_before: input.phaseBefore,
    phase_after: input.phaseAfter,
    project_uuid: input.projectUuid,
    changed,
    invalidates,
    freshness,
    next_intent: nextIntent,
    verification_class: getCapabilityMetadata(input.capability).verificationClass,
    requires_status_refresh: changed.length > 0,
  };
}
