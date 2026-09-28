import {
  capabilityDefaultStaleScopes,
} from "../../../lib/capabilities/manifest";
import {
  cubeChangedFieldsFromResult,
  cubeSemanticScopesFromChangedFields,
} from "../../../lib/receipts/cubeMutation";
import {
  removedElementSemanticScopes,
  renamedElementSemanticScopes,
} from "../../../lib/elementSemanticScopes";
import type {
  ControlAuthoringDomain,
  ControlDelta,
  ControlFreshnessScope,
} from "../types";
import {
  ALL_FRESHNESS_SCOPES,
  STATE_MUTATIONS,
} from "./policy";
import {
  record,
  resultCandidates,
  cubeStateNeutral,
  particleTextureHandoffRequired,
  animationTimelineStateNeutral,
  directAnimationStateNeutral,
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

function semanticHistoryEffectFromResult(result: unknown): {
  stale: ControlFreshnessScope[];
  workspace_projection: boolean;
  acceptance_gates: boolean;
} | null {
  for (const candidate of resultCandidates(result)) {
    const semanticEffect = record(candidate.semantic_effect);
    if (
      !semanticEffect ||
      !Array.isArray(semanticEffect.stale) ||
      typeof semanticEffect.workspace_projection !== "boolean" ||
      typeof semanticEffect.acceptance_gates !== "boolean" ||
      !semanticEffect.stale.every((scope) =>
        ALL_FRESHNESS_SCOPES.includes(scope as ControlFreshnessScope)
      )
    ) {
      continue;
    }
    return {
      stale: [...new Set(
        semanticEffect.stale as ControlFreshnessScope[]
      )],
      workspace_projection: semanticEffect.workspace_projection,
      acceptance_gates: semanticEffect.acceptance_gates,
    };
  }
  return null;
}

export function capabilityMutatesState(
  capability: string,
  succeeded: boolean,
  result: unknown
): boolean {
  if (!succeeded || !STATE_MUTATIONS.has(capability)) return false;
  if (capability === "undo" || capability === "redo") {
    const semanticEffect = semanticHistoryEffectFromResult(result);
    if (semanticEffect && semanticEffect.stale.length === 0) return false;
  }
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
  if (
    capability === "manage_animation_timeline" ||
    capability === "animation_timeline"
  ) {
    return !animationTimelineStateNeutral(result);
  }
  if (
    (capability === "manage_keyframes" ||
      capability === "animation_copy_paste") &&
    directAnimationStateNeutral(capability, result)
  ) {
    return false;
  }
  if (capability === "manage_material" && materialPersistenceOnly(result)) {
    return false;
  }
  if (capability === "save_material_config") {
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
  return cubeChangedFieldsFromResult(root);
}

function authoringDomainsForScopes(
  scopes: readonly ControlFreshnessScope[]
): ControlAuthoringDomain[] {
  const domains = new Set<ControlAuthoringDomain>();
  for (const scope of scopes) {
    if (scope === "GEOMETRY_STRUCTURE") domains.add("GEOMETRY");
    if (
      scope === "UV_MAPPING" ||
      scope === "TEXTURE_APPEARANCE" ||
      scope === "MATERIAL_RENDER"
    ) {
      domains.add("TEXTURING");
    }
    if (
      scope === "ANIMATION_MOTION" ||
      scope === "ANIMATION_CONTROLLER" ||
      scope === "ANIMATION_EFFECTS" ||
      scope === "PARTICLE_SYSTEM"
    ) {
      domains.add("ANIMATION");
    }
  }
  return [...domains];
}

export function geometryInvalidation(
  capability: string,
  result: unknown
): ControlAuthoringDomain[] {
  if (capability === "manage_cubes") {
    const changedFields = effectChangedFields(result);
    const scopes =
      changedFields.length > 0
        ? cubeSemanticScopesFromChangedFields(changedFields)
        : capabilityDefaultStaleScopes(capability);
    return authoringDomainsForScopes(scopes);
  }

  if (capability === "remove_element") {
    for (const candidate of resultCandidates(result)) {
      const removedRoot = record(candidate.removed_root);
      if (typeof removedRoot?.type === "string") {
        return authoringDomainsForScopes(
          removedElementSemanticScopes(removedRoot.type)
        );
      }
    }
  }

  if (capability === "rename_element") {
    for (const candidate of resultCandidates(result)) {
      const element = record(candidate.element);
      if (typeof element?.type === "string") {
        return authoringDomainsForScopes(
          renamedElementSemanticScopes(element.type)
        );
      }
      if (candidate.execution === "applied" && Array.isArray(candidate.changes)) {
        return authoringDomainsForScopes(
          renamedElementSemanticScopes("group")
        );
      }
    }
  }

  const scopes = capabilityDefaultStaleScopes(capability);
  return scopes.length > 0
    ? authoringDomainsForScopes(scopes)
    : ["GEOMETRY"];
}

function semanticHistoryInvalidation(
  result: unknown
): {
  authoring_domains: ControlAuthoringDomain[];
  workspace_projection: boolean;
  acceptance_gates: boolean;
} | null {
  const effect = semanticHistoryEffectFromResult(result);
  if (!effect) return null;

  return {
    authoring_domains: authoringDomainsForScopes(effect.stale),
    workspace_projection: effect.workspace_projection,
    acceptance_gates: effect.acceptance_gates,
  };
}

export function mutationInvalidation(
  capability: string,
  domain: ControlAuthoringDomain,
  succeeded: boolean,
  result: unknown
): ControlDelta["invalidates"] {
  if (succeeded && (capability === "undo" || capability === "redo")) {
    const historyInvalidation = semanticHistoryInvalidation(result);
    if (historyInvalidation) return historyInvalidation;
  }

  if (succeeded && capability === "save_material_config") {
    return {
      authoring_domains: [],
      workspace_projection: true,
      acceptance_gates: false,
    };
  }

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
    if (capability === "create_project") {
      affectedDomains = ["GEOMETRY", "TEXTURING", "ANIMATION"];
    } else if (capability === "undo" || capability === "redo") {
      affectedDomains = ["GEOMETRY", "TEXTURING", "ANIMATION"];
    } else if (domain === "GEOMETRY") affectedDomains = geometryInvalidation(capability, result);
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

    return {
      stale: cubeSemanticScopesFromChangedFields(changedFields),
      precise: true,
    };
  }

  if (capability === "remove_element") {
    for (const candidate of resultCandidates(result)) {
      const removedRoot = record(candidate.removed_root);
      if (typeof removedRoot?.type === "string") {
        return {
          stale: removedElementSemanticScopes(removedRoot.type),
          precise: true,
        };
      }
    }
  }

  if (capability === "rename_element") {
    for (const candidate of resultCandidates(result)) {
      const element = record(candidate.element);
      if (typeof element?.type === "string") {
        return {
          stale: renamedElementSemanticScopes(element.type),
          precise: true,
        };
      }
      if (candidate.execution === "applied" && Array.isArray(candidate.changes)) {
        return {
          stale: renamedElementSemanticScopes("group"),
          precise: true,
        };
      }
    }
  }

  const defaults = capabilityDefaultStaleScopes(capability);
  return {
    stale: defaults.length > 0 ? defaults : ["GEOMETRY_STRUCTURE"],
    precise: true,
  };
}

export function staleScopesForMutation(
  capability: string,
  domain: ControlAuthoringDomain,
  result: unknown
): { stale: ControlFreshnessScope[]; precise: boolean } {
  if (domain === "GEOMETRY") return geometryFreshnessScopes(capability, result);

  if (domain === "TEXTURING") {
    const defaults = capabilityDefaultStaleScopes(capability);
    if (defaults.length > 0) {
      return { stale: defaults, precise: true };
    }
    return {
      stale: ["TEXTURE_APPEARANCE", "MATERIAL_RENDER"],
      precise: false,
    };
  }

  if (capability === "create_project") {
    return {
      stale: [...ALL_FRESHNESS_SCOPES],
      precise: false,
    };
  }

  if (capability === "undo" || capability === "redo") {
    const semanticEffect = semanticHistoryEffectFromResult(result);
    if (semanticEffect) {
      return {
        stale: semanticEffect.stale,
        precise: true,
      };
    }
    return {
      stale: [...ALL_FRESHNESS_SCOPES],
      precise: false,
    };
  }

  if (domain === "ANIMATION") {
    const defaults = capabilityDefaultStaleScopes(capability);
    if (defaults.length > 0) {
      return { stale: defaults, precise: true };
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
