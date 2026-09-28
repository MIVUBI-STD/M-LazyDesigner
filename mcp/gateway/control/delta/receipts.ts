import {
  isCreateProjectReceipt,
  isPhaseTransitionReceipt,
} from "../../../lib/receipts/authorityTransition";
import { isAnimationControllerReceipt } from "../../../lib/receipts/animationController";
import { isAnimationEffectsReceipt } from "../../../lib/receipts/animationEffects";
import {
  isBoneRiggingDeletionReceipt,
  isBoneRiggingStateReceipt,
  isNativeIkControllerReceipt,
} from "../../../lib/receipts/boneRigging";
import { isGroupMutationReceipt } from "../../../lib/receipts/groupMutation";
import { isLocatorMutationReceipt } from "../../../lib/receipts/locatorMutation";
import { isMaterialInstanceMutationReceipt } from "../../../lib/receipts/materialInstances";
import {
  isMaterialMutationReceipt,
  isMaterialPersistenceReceipt,
} from "../../../lib/receipts/materialMutation";
import { isVerifiedParticleWriteReceipt } from "../../../lib/receipts/particleMutation";
import { isRenderProfileMutationReceipt } from "../../../lib/receipts/renderProfile";
import { isTextureGroupReceipt } from "../../../lib/receipts/textureGroup";
import { isRemoveElementReceipt } from "../../../lib/receipts/removeElement";
import { isAppliedRenameElementReceipt } from "../../../lib/receipts/renameElement";

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
  return resultCandidates(value).some(isBoneRiggingDeletionReceipt);
}

export function boneRiggingStateReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some(isBoneRiggingStateReceipt);
}

export function nativeIkControllerReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some(isNativeIkControllerReceipt);
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
      isMaterialPersistenceReceipt(candidate) ||
      (
        candidate.operation === "save" &&
        candidate.scope === "material_persistence_only"
      )
  );
}

export function materialPersistenceReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some(isMaterialPersistenceReceipt);
}

export function animationControllerReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some(isAnimationControllerReceipt);
}

export function textureGroupReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some(isTextureGroupReceipt);
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


export function renameElementReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some(isAppliedRenameElementReceipt);
}

export function createProjectReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some(isCreateProjectReceipt);
}

export function phaseTransitionReceiptComplete(value: unknown): boolean {
  return resultCandidates(value).some(isPhaseTransitionReceipt);
}

type ContinuationReceiptValidator = (value: unknown) => boolean;

const CONTINUATION_RECEIPT_VALIDATORS: Readonly<
  Record<string, ContinuationReceiptValidator>
> = {
  create_project: createProjectReceiptComplete,
  switch_authoring_phase: phaseTransitionReceiptComplete,
  manage_animation_effects: animationEffectsReceiptComplete,
  manage_particle: particleMutationReceiptComplete,
  manage_animation_controller: animationControllerReceiptComplete,
  add_texture_group: textureGroupReceiptComplete,
  manage_material: materialMutationReceiptComplete,
  create_pbr_material: materialMutationReceiptComplete,
  configure_material: materialMutationReceiptComplete,
  assign_texture_channel: materialMutationReceiptComplete,
  import_texture_set: materialMutationReceiptComplete,
  manage_material_instances: materialInstanceMutationReceiptComplete,
  set_face_material_instance: materialInstanceMutationReceiptComplete,
  bulk_set_material_instances: materialInstanceMutationReceiptComplete,
  clear_material_instances: materialInstanceMutationReceiptComplete,
  manage_render_profile: renderProfileMutationReceiptComplete,
  remove_element: removeElementReceiptComplete,
  rename_element: renameElementReceiptComplete,
  manage_locator: locatorReceiptComplete,
  manage_null_object: locatorReceiptComplete,
  bone_rigging: (value) =>
    nativeIkControllerReceiptComplete(value) ||
    boneRiggingStateReceiptComplete(value) ||
    boneRiggingDeletionReceiptComplete(value),
  add_group: (value) => groupReceiptComplete("add_group", value),
  modify_group: (value) => groupReceiptComplete("modify_group", value),
  reparent_element: (value) => groupReceiptComplete("reparent_element", value),
};

export const CONTINUATION_RECEIPT_CAPABILITIES = Object.freeze(
  Object.keys(CONTINUATION_RECEIPT_VALIDATORS).sort((a, b) =>
    a.localeCompare(b)
  )
);

export function receiptSupportsContinuation(
  capability: string,
  value: unknown
): boolean {
  return CONTINUATION_RECEIPT_VALIDATORS[capability]?.(value) ?? false;
}
