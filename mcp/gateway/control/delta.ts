import {
  authoringDomainForCapability,
  sourceOwnerForCapability,
} from "./registry";
import type {
  ControlAuthoringDomain,
  ControlDelta,
  ControlFreshnessScope,
  ControlVerificationScope,
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

function resultCandidates(value: unknown): Record<string, unknown>[] {
  const root = record(value);
  if (!root) return [];
  return [root, record(root.structuredContent)].filter(
    (entry): entry is Record<string, unknown> => entry !== null
  );
}

function cubeStateNeutral(value: unknown): boolean {
  return resultCandidates(value).some(
    (candidate) =>
      candidate.execution === "planned" ||
      candidate.execution === "unchanged"
  );
}

function locatorReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    const state = record(candidate.state);
    if (
      candidate.execution !== "applied" ||
      !state ||
      typeof state.uuid !== "string" ||
      typeof state.name !== "string" ||
      typeof state.type !== "string" ||
      !Array.isArray(candidate.changed_fields)
    ) {
      return false;
    }
    if (!Array.isArray(state.position) || state.position.length !== 3) return false;
    if (state.type === "locator") {
      return (
        Array.isArray(state.rotation) &&
        state.rotation.length === 3 &&
        typeof state.ignore_inherited_scale === "boolean"
      );
    }
    return state.type === "null_object";
  });
}

function nativeIkControllerReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    if (candidate.action !== "set_ik_controller") return false;
    const controller = record(candidate.controller);
    return Boolean(
      controller &&
      typeof controller.uuid === "string" &&
      typeof controller.name === "string" &&
      Object.prototype.hasOwnProperty.call(controller, "ik_target") &&
      Object.prototype.hasOwnProperty.call(controller, "ik_source") &&
      Object.prototype.hasOwnProperty.call(controller, "ik_pole") &&
      typeof controller.lock_ik_target_rotation === "boolean"
    );
  });
}

function groupReceiptComplete(capability: string, value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    if (candidate.execution !== "applied") return false;
    if (capability === "add_group") {
      return Array.isArray(candidate.groups) && candidate.groups.length > 0 &&
        candidate.groups.every((entry) => {
          const group = record(entry);
          return Boolean(
            group &&
            typeof group.uuid === "string" &&
            typeof group.name === "string" &&
            Array.isArray(group.origin) &&
            Array.isArray(group.rotation) &&
            typeof group.visibility === "boolean" &&
            typeof group.parent === "string"
          );
        });
    }
    if (capability === "modify_group") {
      const group = record(candidate.group);
      return Boolean(
        group &&
        typeof group.uuid === "string" &&
        Array.isArray(group.origin) &&
        Array.isArray(group.rotation) &&
        typeof group.visibility === "boolean" &&
        typeof group.parent === "string"
      );
    }
    if (capability === "reparent_element") {
      return (
        typeof candidate.id === "string" &&
        typeof candidate.parent === "string" &&
        candidate.transform_policy === "preserve_local"
      );
    }
    return false;
  });
}

function particleTextureHandoffRequired(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    const dependency = record(candidate.texture_dependency);
    return dependency?.status === "REQUIRES_TEXTURING";
  });
}

const STATE_NEUTRAL_ANIMATION_ACTIONS = new Set([
  "select",
  "play",
  "pause",
  "stop",
  "set_time",
  "select_range",
  "expand_bones",
  "collapse_bones",
  "copy",
]);

function animationTimelineStateNeutral(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    const action = typeof candidate.action === "string" ? candidate.action : null;
    const scope = typeof candidate.scope === "string" ? candidate.scope : null;
    return (
      candidate.changed === false ||
      scope === "timeline_view_only" ||
      scope === "animation_clipboard_only" ||
      (action !== null && STATE_NEUTRAL_ANIMATION_ACTIONS.has(action))
    );
  });
}

function materialPersistenceOnly(value: unknown): boolean {
  return resultCandidates(value).some(
    (candidate) =>
      candidate.operation === "save" &&
      candidate.scope === "material_persistence_only"
  );
}

function animationControllerReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    const controller = record(candidate.controller);
    const created = record(candidate.created);
    const removed = record(candidate.removed);
    if (
      candidate.execution !== "applied" ||
      !controller ||
      typeof controller.uuid !== "string" ||
      typeof controller.name !== "string" ||
      typeof controller.state_count !== "number" ||
      !Array.isArray(candidate.affected_states) ||
      !created ||
      !removed
    ) {
      return false;
    }

    return candidate.affected_states.every((entry) => {
      const state = record(entry);
      return Boolean(
        state &&
        typeof state.uuid === "string" &&
        typeof state.name === "string" &&
        Array.isArray(state.animations) &&
        Array.isArray(state.transitions) &&
        Array.isArray(state.sounds) &&
        Array.isArray(state.particles)
      );
    });
  });
}

function textureGroupReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    const group = record(candidate.texture_group);
    if (
      candidate.operation !== "create_group" ||
      !group ||
      typeof group.uuid !== "string" ||
      typeof group.name !== "string" ||
      typeof group.is_material !== "boolean" ||
      !Array.isArray(candidate.textures)
    ) {
      return false;
    }
    return candidate.textures.every((entry) => {
      const texture = record(entry);
      return Boolean(
        texture &&
        typeof texture.uuid === "string" &&
        typeof texture.name === "string" &&
        texture.group === group.uuid
      );
    });
  });
}

function materialMutationReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    if (!["create", "configure", "assign_channel", "import_texture_set"].includes(String(candidate.operation))) {
      return false;
    }
    const material = record(candidate.material);
    const channels = record(material?.channels);
    const config = record(material?.config);
    return Boolean(
      material &&
      typeof material.uuid === "string" &&
      typeof material.name === "string" &&
      channels &&
      ["color", "normal", "height", "mer"].every((key) =>
        Object.prototype.hasOwnProperty.call(channels, key)
      ) &&
      config &&
      Object.prototype.hasOwnProperty.call(config, "saved")
    );
  });
}

function materialInstanceMutationReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    if (!["set", "bulk_set", "clear"].includes(String(candidate.operation))) {
      return false;
    }
    if (
      typeof candidate.face_count !== "number" ||
      !Array.isArray(candidate.changes) ||
      candidate.changes.length !== candidate.face_count
    ) {
      return false;
    }
    return candidate.changes.every((entry) => {
      const change = record(entry);
      return Boolean(
        change &&
        typeof change.cube_uuid === "string" &&
        typeof change.cube_name === "string" &&
        typeof change.face === "string" &&
        typeof change.material_name === "string"
      );
    });
  });
}

function particleMutationReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    if (
      candidate.valid !== true ||
      candidate.artifact_ready !== true ||
      typeof candidate.wrote_to_path !== "string" ||
      candidate.wrote_to_path.length === 0 ||
      !Array.isArray(candidate.writes)
    ) {
      return false;
    }

    const summary = record(candidate.summary);
    if (
      !summary ||
      typeof summary.identifier !== "string" ||
      summary.identifier.length === 0 ||
      typeof summary.component_count !== "number" ||
      !Array.isArray(summary.diagnostics)
    ) {
      return false;
    }

    return candidate.writes.some((entry) => {
      const write = record(entry);
      return Boolean(
        write &&
          write.kind === "particle" &&
          write.path === candidate.wrote_to_path &&
          typeof write.byte_length === "number" &&
          write.byte_length > 0 &&
          typeof write.replaced_existing === "boolean"
      );
    });
  });
}

function animationEffectsReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    if (
      !record(candidate.animation) ||
      typeof candidate.operation_count !== "number" ||
      !Array.isArray(candidate.results)
    ) {
      return false;
    }

    return candidate.results.every((entry) => {
      const result = record(entry);
      if (!result || typeof result.channel !== "string") return false;

      const removed = record(result.removed);
      if (removed) {
        return (
          typeof removed.keyframe_uuid === "string" &&
          (removed.data_point_index === null ||
            typeof removed.data_point_index === "number")
        );
      }

      return (
        typeof result.keyframe_uuid === "string" &&
        typeof result.time === "number" &&
        (result.data_point_index === null ||
          typeof result.data_point_index === "number")
      );
    });
  });
}

function cubeVerificationScope(value: unknown): ControlVerificationScope | null {
  for (const candidate of resultCandidates(value)) {
    const scope = record(candidate.visual_scope);
    const framing = record(scope?.framing);
    const ids = scope?.cube_uuids;
    const min = framing?.min;
    const max = framing?.max;
    if (
      !Array.isArray(ids) || ids.length === 0 || ids.length > 32 ||
      !ids.every((entry) => typeof entry === "string") ||
      !Array.isArray(min) || !Array.isArray(max) || min.length !== 3 || max.length !== 3 ||
      ![...min, ...max].every((entry) => typeof entry === "number" && Number.isFinite(entry))
    ) continue;
    return {
      kind: "CUBE_TARGETS",
      cube_uuids: [...ids],
      framing: {
        min: [...min] as [number, number, number],
        max: [...max] as [number, number, number],
      },
    };
  }
  return null;
}

function animationVerificationScope(value: unknown): ControlVerificationScope | null {
  for (const candidate of resultCandidates(value)) {
    const animation = record(candidate.animation);
    const bone = record(candidate.bone);
    if (
      typeof animation?.uuid !== "string" ||
      typeof bone?.uuid !== "string" ||
      !Array.isArray(candidate.affected_keyframes)
    ) {
      continue;
    }
    const times = candidate.affected_keyframes
      .map((entry) => record(entry)?.time)
      .filter((time): time is number => typeof time === "number" && Number.isFinite(time));
    if (times.length === 0) continue;
    const start = Math.min(...times);
    const end = Math.max(...times);
    const midpoint = start + (end - start) / 2;
    return {
      kind: "ANIMATION_RANGE",
      animation_uuid: animation.uuid,
      bone_uuid: bone.uuid,
      channel: typeof candidate.channel === "string" ? candidate.channel : null,
      time_range: [start, end],
      review: {
        bone_ids: [bone.uuid],
        range: { start, end },
        sample_times: [...new Set([start, midpoint, end])],
      },
    };
  }
  return null;
}

function textureVerificationScope(value: unknown): ControlVerificationScope | null {
  for (const candidate of resultCandidates(value)) {
    const texture = record(candidate.texture);
    const revision = record(candidate.revision);
    const rect = candidate.affected_rect;
    if (
      typeof texture?.uuid !== "string" ||
      typeof revision?.after !== "string" ||
      !Array.isArray(rect) ||
      rect.length !== 4 ||
      !rect.every((entry) => typeof entry === "number" && Number.isSafeInteger(entry))
    ) {
      continue;
    }
    const visualEvidence = record(candidate.visual_evidence);
    return {
      kind: "TEXTURE_REGION",
      texture_uuid: texture.uuid,
      affected_rect: rect as [number, number, number, number],
      revision: revision.after,
      evidence_source:
        visualEvidence?.kind === "affected_region_png"
          ? "mutation_response"
          : "follow_up_read",
    };
  }
  return null;
}

function verificationScopeForResult(
  capability: string,
  verificationClass: ControlDelta["verification_class"],
  result: unknown
): ControlVerificationScope | null {
  if (verificationClass !== "visual") return null;
  if (capability === "manage_cubes") return cubeVerificationScope(result);
  if (capability === "manage_animation_timeline") return animationVerificationScope(result);
  if (capability === "paint_texture_transaction") return textureVerificationScope(result);
  return null;
}

function verificationClassForResult(
  capability: string,
  succeeded: boolean,
  freshness: ControlDelta["freshness"],
  result: unknown
): ControlDelta["verification_class"] {
  const fallback = getCapabilityMetadata(capability).verificationClass;
  if (!succeeded) return fallback;

  if (STATE_MUTATIONS.has(capability) && freshness.basis === "NO_CHANGE") {
    return "receipt_only";
  }

  if (
    capability === "manage_animation_effects" &&
    animationEffectsReceiptComplete(result)
  ) {
    return "receipt_only";
  }

  if (
    capability === "manage_particle" &&
    particleMutationReceiptComplete(result)
  ) {
    return "receipt_only";
  }


  if (
    capability === "manage_animation_controller" &&
    animationControllerReceiptComplete(result)
  ) {
    return "receipt_only";
  }

  if (
    capability === "add_texture_group" &&
    textureGroupReceiptComplete(result)
  ) {
    return "receipt_only";
  }

  if (
    (capability === "manage_material" || capability === "import_texture_set") &&
    materialMutationReceiptComplete(result)
  ) {
    return "receipt_only";
  }

  if (
    capability === "manage_material_instances" &&
    materialInstanceMutationReceiptComplete(result)
  ) {
    return "receipt_only";
  }

  if (
    (capability === "manage_locator" || capability === "manage_null_object") &&
    locatorReceiptComplete(result)
  ) {
    return "receipt_only";
  }

  if (
    capability === "bone_rigging" &&
    nativeIkControllerReceiptComplete(result)
  ) {
    return "receipt_only";
  }

  if (
    ["add_group", "modify_group", "reparent_element"].includes(capability) &&
    groupReceiptComplete(capability, result)
  ) {
    return "receipt_only";
  }

  return fallback;
}

function particleHasAuthoredEffect(value: unknown): boolean {
  const candidates = resultCandidates(value);
  if (candidates.length === 0) return true;

  const explicitEffectReceipt = candidates.find(
    (candidate) =>
      Object.prototype.hasOwnProperty.call(candidate, "wrote_to_path") &&
      Object.prototype.hasOwnProperty.call(candidate, "preview_path")
  );
  if (!explicitEffectReceipt) return true;

  const wroteToPath = explicitEffectReceipt.wrote_to_path;
  const previewPath = explicitEffectReceipt.preview_path;
  return (
    (typeof wroteToPath === "string" && wroteToPath.length > 0) ||
    (typeof previewPath === "string" && previewPath.length > 0)
  );
}

function materialInstancesStateNeutral(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    if (
      Array.isArray(candidate.material_instances) &&
      typeof candidate.total_unique_instances === "number"
    ) {
      return true;
    }
    return record(candidate.cube) !== null && record(candidate.faces) !== null &&
      typeof candidate.operation !== "string";
  });
}

function renderProfileStateNeutral(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    if (candidate.execution === "read") return true;

    const transaction = record(candidate.write_transaction);
    if (
      candidate.execution === "applied" &&
      transaction?.state === "compile_only" &&
      transaction.write_count === 0
    ) {
      return true;
    }

    if (
      candidate.execution === "applied" &&
      Object.prototype.hasOwnProperty.call(candidate, "write") &&
      candidate.write === null
    ) {
      return true;
    }

    return false;
  });
}

function renameElementStateNeutral(value: unknown): boolean {
  return resultCandidates(value).some(
    (candidate) =>
      candidate.execution === "planned" || candidate.execution === "unchanged"
  );
}

function capabilityMutatesState(
  capability: string,
  succeeded: boolean,
  result: unknown
): boolean {
  if (!succeeded || !STATE_MUTATIONS.has(capability)) return false;
  if (capability === "manage_cubes" && cubeStateNeutral(result)) return false;
  if (capability === "rename_element" && renameElementStateNeutral(result)) return false;
  if (capability === "manage_particle") {
    if (particleTextureHandoffRequired(result)) return false;
    return particleHasAuthoredEffect(result);
  }
  if (capability === "manage_animation_timeline") {
    return !animationTimelineStateNeutral(result);
  }
  if (capability === "manage_material" && materialPersistenceOnly(result)) {
    return false;
  }
  if (capability === "manage_material_instances") {
    return !materialInstancesStateNeutral(result);
  }
  if (capability === "manage_render_profile") {
    return !renderProfileStateNeutral(result);
  }
  return true;
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
  if (
    succeeded &&
    capability === "manage_material" &&
    materialPersistenceOnly(result)
  ) {
    return {
      authoring_domains: [],
      workspace_projection: true,
      acceptance_gates: false,
    };
  }

  const mutates = capabilityMutatesState(capability, succeeded, result);
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


function authoritativeRevisionEvidence(
  capability: string,
  result: unknown
): ControlDelta["revision_evidence"] {
  if (capability !== "paint_texture_transaction") return {};

  for (const candidate of resultCandidates(result)) {
    const revision = record(candidate.revision);
    if (typeof revision?.after === "string" && revision.after.length > 0) {
      return { TEXTURE_APPEARANCE: revision.after };
    }
  }

  return {};
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

  const mutates = capabilityMutatesState(capability, true, result);
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
  const revisionEvidence = input.succeeded
    ? authoritativeRevisionEvidence(input.capability, input.result)
    : {};
  const verificationClass = verificationClassForResult(
    input.capability,
    input.succeeded,
    freshness,
    input.result
  );
  const verificationScope = verificationScopeForResult(
    input.capability,
    verificationClass,
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
    revision_evidence: revisionEvidence,
    next_intent: nextIntent,
    verification_class: verificationClass,
    verification_scope: verificationScope,
    requires_status_refresh: changed.length > 0,
  };
}


/**
 * Projects the rich internal Control delta into the minimum continuation state
 * required by an AI client. Internal Control keeps the complete delta for tests,
 * diagnostics and policy decisions; the Gateway drops only values that are
 * static, already known from the tool call, or deterministically derivable.
 *
 * Freshness contract:
 * - NO_CHANGE means every scope remains fresh.
 * - PRECISE_EFFECT / CONSERVATIVE_EFFECT list stale scopes; unlisted scopes remain fresh.
 * - UNKNOWN_OUTCOME keeps the complete unknown scope list and never implies freshness.
 */
export function projectControlDeltaForGateway(delta: ControlDelta) {
  const phaseChanged = delta.phase_before !== delta.phase_after;
  const freshness =
    delta.freshness.basis === "NO_CHANGE"
      ? { basis: delta.freshness.basis }
      : delta.freshness.basis === "UNKNOWN_OUTCOME"
        ? {
            basis: delta.freshness.basis,
            unknown: delta.freshness.unknown,
          }
        : {
            basis: delta.freshness.basis,
            stale: delta.freshness.stale,
          };

  return {
    authoring_domain: delta.authoring_domain,
    project_uuid: delta.project_uuid,
    ...(delta.changed.length > 0 ? { changed: delta.changed } : {}),
    ...(phaseChanged
      ? {
          phase_before: delta.phase_before,
          phase_after: delta.phase_after,
        }
      : {}),
    invalidates: delta.invalidates,
    freshness,
    ...(Object.keys(delta.revision_evidence).length > 0
      ? { revision_evidence: delta.revision_evidence }
      : {}),
    next_intent: delta.next_intent,
    verification_class: delta.verification_class,
    ...(delta.verification_scope !== null
      ? { verification_scope: delta.verification_scope }
      : {}),
    requires_status_refresh: delta.requires_status_refresh,
  };
}
