import { isAnimationControllerReceipt } from "../../../lib/receipts/animationController";
import { isAnimationEffectsReceipt } from "../../../lib/receipts/animationEffects";
import { isGroupMutationReceipt } from "../../../lib/receipts/groupMutation";
import { isLocatorMutationReceipt } from "../../../lib/receipts/locatorMutation";
import { isMaterialInstanceMutationReceipt } from "../../../lib/receipts/materialInstances";
import { isMaterialMutationReceipt } from "../../../lib/receipts/materialMutation";
import { isVerifiedParticleWriteReceipt } from "../../../lib/receipts/particleMutation";
import { isRenderProfileMutationReceipt } from "../../../lib/receipts/renderProfile";
import { isRemoveElementReceipt } from "../../../lib/receipts/removeElement";

export function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function resultCandidates(value: unknown): Record<string, unknown>[] {
  const root = record(value);
  if (!root) return [];
  return [root, record(root.structuredContent)].filter(
    (entry): entry is Record<string, unknown> => entry !== null
  );
}

export function cubeStateNeutral(value: unknown): boolean {
  return resultCandidates(value).some(
    (candidate) =>
      candidate.execution === "planned" ||
      candidate.execution === "unchanged"
  );
}

export function locatorReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some(isLocatorMutationReceipt);
}

export function boneRiggingDeletionReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    if (candidate.action !== "delete") return false;
    const removedRoot = record(candidate.removed_root);
    const removedCounts = record(candidate.removed_counts);
    if (
      !removedRoot ||
      !removedCounts ||
      typeof removedRoot.uuid !== "string" ||
      removedRoot.uuid.length === 0 ||
      typeof removedRoot.name !== "string" ||
      removedRoot.name.length === 0 ||
      typeof removedRoot.parent !== "string" ||
      typeof removedCounts.groups !== "number" ||
      typeof removedCounts.elements !== "number" ||
      typeof removedCounts.total_nodes !== "number" ||
      typeof candidate.affected_animations !== "number"
    ) {
      return false;
    }
    return (
      removedCounts.groups >= 1 &&
      removedCounts.elements >= 0 &&
      removedCounts.total_nodes ===
        removedCounts.groups + removedCounts.elements &&
      candidate.affected_animations >= 0
    );
  });
}

export function boneRiggingStateReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some((candidate) => {
    if (
      ![
        "create",
        "parent",
        "unparent",
        "rename",
        "set_pivot",
        "set_ik",
        "mirror",
      ].includes(String(candidate.action))
    ) {
      return false;
    }

    const bone = record(candidate.bone);
    if (
      !bone ||
      typeof bone.uuid !== "string" ||
      bone.uuid.length === 0 ||
      typeof bone.name !== "string" ||
      bone.name.length === 0 ||
      typeof bone.parent !== "string" ||
      !Array.isArray(bone.origin) ||
      bone.origin.length !== 3 ||
      !bone.origin.every(
        (value) => typeof value === "number" && Number.isFinite(value)
      ) ||
      !Array.isArray(bone.rotation) ||
      bone.rotation.length !== 3 ||
      !bone.rotation.every(
        (value) => typeof value === "number" && Number.isFinite(value)
      ) ||
      typeof bone.ik_enabled !== "boolean" ||
      !Object.prototype.hasOwnProperty.call(bone, "ik_target")
    ) {
      return false;
    }

    return bone.ik_target === null || typeof bone.ik_target === "string";
  });
}

export function nativeIkControllerReceiptComplete(value: unknown): boolean {
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

export function groupReceiptComplete(capability: string, value: unknown): boolean {
  return resultCandidates(value).some((candidate) =>
    isGroupMutationReceipt(capability, candidate)
  );
}

export function particleTextureHandoffRequired(value: unknown): boolean {
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

export function animationTimelineStateNeutral(value: unknown): boolean {
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

export function directAnimationStateNeutral(
  capability: string,
  value: unknown
): boolean {
  return resultCandidates(value).some((candidate) => {
    if (capability === "manage_keyframes") {
      return candidate.action === "select";
    }
    if (capability === "animation_copy_paste") {
      return (
        candidate.action === "copy" &&
        candidate.scope === "animation_clipboard_only"
      );
    }
    return false;
  });
}

export function materialPersistenceOnly(value: unknown): boolean {
  return resultCandidates(value).some(
    (candidate) =>
      candidate.operation === "save" &&
      candidate.scope === "material_persistence_only"
  );
}

export function animationControllerReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some(isAnimationControllerReceipt);
}

export function textureGroupReceiptComplete(value: unknown): boolean {
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

export function materialMutationReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some(isMaterialMutationReceipt);
}

export function materialInstanceMutationReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some(isMaterialInstanceMutationReceipt);
}

export function particleMutationReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some(isVerifiedParticleWriteReceipt);
}

export function removeElementReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some(isRemoveElementReceipt);
}

export function renderProfileMutationReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some(isRenderProfileMutationReceipt);
}

export function animationEffectsReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some(isAnimationEffectsReceipt);
}

