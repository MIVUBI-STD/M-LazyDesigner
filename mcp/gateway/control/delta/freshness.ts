import type {
  ControlAuthoringDomain,
  ControlDelta,
  ControlFreshnessScope,
} from "../types";
import {
  ALL_FRESHNESS_SCOPES,
  HIERARCHY_OR_MOTION_STRUCTURE,
  MATERIAL_RENDER_MUTATIONS,
  SHAPE_FIELDS,
  STATE_MUTATIONS,
  TEXTURE_APPEARANCE_MUTATIONS,
  UV_FIELDS,
} from "./policy";
import {
  record,
  resultCandidates,
  cubeStateNeutral,
  particleTextureHandoffRequired,
  animationTimelineStateNeutral,
  materialPersistenceOnly,
} from "./receipts";

export function particleHasAuthoredEffect(value: unknown): boolean {
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

export function materialInstancesStateNeutral(value: unknown): boolean {
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

export function renderProfileStateNeutral(value: unknown): boolean {
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

export function textureLayerMetadataOnly(value: unknown): boolean {
  return resultCandidates(value).some(
    (candidate) =>
      candidate.operation === "rename_layer" ||
      (candidate.operation === "batch_metadata" &&
        candidate.recomposed === false)
  );
}

export function renameElementStateNeutral(value: unknown): boolean {
  return resultCandidates(value).some(
    (candidate) =>
      candidate.execution === "planned" || candidate.execution === "unchanged"
  );
}

export function capabilityMutatesState(
  capability: string,
  succeeded: boolean,
  result: unknown
): boolean {
  if (!succeeded || !STATE_MUTATIONS.has(capability)) return false;
  if (capability === "manage_cubes" && cubeStateNeutral(result)) return false;
  if (capability === "rename_element" && renameElementStateNeutral(result)) return false;
  if (
    capability === "texture_layer_management" &&
    textureLayerMetadataOnly(result)
  ) {
    return false;
  }
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

export function effectChangedFields(value: unknown): string[] {
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

export function geometryInvalidation(capability: string, result: unknown): ControlAuthoringDomain[] {
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

export function mutationInvalidation(
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

  if (
    succeeded &&
    capability === "texture_layer_management" &&
    textureLayerMetadataOnly(result)
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

export function geometryFreshnessScopes(
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

export function staleScopesForMutation(
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


export function authoritativeRevisionEvidence(
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

export function mutationFreshness(
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
