import { getCapabilityMetadata } from "../../../lib/capabilityMetadata";
import { cubeVisualScopeFromResult } from "../../../lib/receipts/cubeMutation";
import type { ControlDelta, ControlVerificationScope } from "../types";
import { STATE_MUTATIONS } from "./policy";
import {
  record,
  resultCandidates,
  materialPersistenceOnly,
  materialPersistenceReceiptComplete,
  receiptSupportsContinuation,

} from "./receipts";

export function cubeVerificationScope(value: unknown): ControlVerificationScope | null {
  for (const candidate of resultCandidates(value)) {
    const scope = cubeVisualScopeFromResult(candidate);
    if (!scope) continue;
    return {
      kind: "CUBE_TARGETS",
      cube_uuids: [...scope.cube_uuids],
      framing: {
        min: [...scope.framing.min] as [number, number, number],
        max: [...scope.framing.max] as [number, number, number],
      },
    };
  }
  return null;
}

export function animationVerificationScope(value: unknown): ControlVerificationScope | null {
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

export function textureVerificationScope(value: unknown): ControlVerificationScope | null {
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

export function verificationScopeForResult(
  capability: string,
  verificationClass: ControlDelta["verification_class"],
  result: unknown
): ControlVerificationScope | null {
  if (verificationClass !== "visual") return null;
  if (capability === "manage_cubes") return cubeVerificationScope(result);
  if (
    capability === "manage_animation_timeline" ||
    capability === "manage_keyframes"
  ) {
    return animationVerificationScope(result);
  }
  if (capability === "paint_texture_transaction") return textureVerificationScope(result);
  return null;
}

export function verificationClassForResult(
  capability: string,
  succeeded: boolean,
  freshness: ControlDelta["freshness"],
  result: unknown
): ControlDelta["verification_class"] {
  const fallback = getCapabilityMetadata(capability).verificationClass;
  if (!succeeded) return fallback;

  if (
    capability === "manage_material" &&
    materialPersistenceOnly(result) &&
    !materialPersistenceReceiptComplete(result)
  ) {
    return fallback;
  }

  if (STATE_MUTATIONS.has(capability) && freshness.basis === "NO_CHANGE") {
    return "receipt_only";
  }

  if (receiptSupportsContinuation(capability, result)) {
    return "receipt_only";
  }

  return fallback;
}
