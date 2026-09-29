import type { VerificationEvidenceHandle } from "@/lib/orchestration/evidenceRegistry";
import type { VerificationEvidenceRequest } from "@/lib/orchestration/evidencePlan";
import type { ModelView, VisualEvidenceTarget } from "@/server/tools/camera";

export type MinecraftQualityClass =
  | "REQUIRED_PART"
  | "TOPOLOGY_ATTACHMENT"
  | "PRIMARY_FORM"
  | "NEGATIVE_SPACE_CONTACT"
  | "RIG_MOTION_READINESS"
  | "SECONDARY_DETAIL"
  | "TEXTURE_MATERIAL"
  | "ANIMATION_MOTION"
  | "UNCLASSIFIED";

export type MinecraftQualityOwner =
  | "GEOMETRY"
  | "RIG"
  | "TEXTURE"
  | "ANIMATION"
  | "UNKNOWN";

export type VerificationDiscrepancy = {
  code: string;
  severity: "INFO" | "REVIEW" | "BLOCKING";
  summary: string;
  views?: ModelView[];
  evidence_targets?: VisualEvidenceTarget[];
  /**
   * Explicit evidence classification only. Producers must not infer this from
   * prose wording. Missing classification stays UNCLASSIFIED downstream.
   */
  quality_class?: MinecraftQualityClass;
  owner?: MinecraftQualityOwner;
  cause_family?: string;
};

export type CompactVerificationEvidence = {
  evidence_handle: VerificationEvidenceHandle;
  domain: VerificationEvidenceRequest["domain"];
  source: VerificationEvidenceRequest["source"];
  state: "CLEAR" | "REVIEW_REQUIRED" | "BLOCKED";
  discrepancy_count: number;
  discrepancies: VerificationDiscrepancy[];
};

const MAX_DISCREPANCIES = 6;

const SEVERITY_PRIORITY: Readonly<Record<VerificationDiscrepancy["severity"], number>> = {
  BLOCKING: 0,
  REVIEW: 1,
  INFO: 2,
};

const QUALITY_PRIORITY: Readonly<Record<MinecraftQualityClass, number>> = {
  REQUIRED_PART: 0,
  TOPOLOGY_ATTACHMENT: 1,
  PRIMARY_FORM: 2,
  NEGATIVE_SPACE_CONTACT: 3,
  RIG_MOTION_READINESS: 4,
  TEXTURE_MATERIAL: 5,
  ANIMATION_MOTION: 5,
  SECONDARY_DETAIL: 6,
  UNCLASSIFIED: 7,
};

function qualityClassOf(
  discrepancy: VerificationDiscrepancy
): MinecraftQualityClass {
  return discrepancy.quality_class ?? "UNCLASSIFIED";
}

/**
 * Difference-first ordering for Minecraft authoring.
 *
 * This never classifies free-form prose. It only uses explicit producer-owned
 * quality metadata, otherwise preserving original order among equally ranked
 * UNCLASSIFIED discrepancies.
 */
export function prioritizeMinecraftDiscrepancies(
  discrepancies: readonly VerificationDiscrepancy[]
): VerificationDiscrepancy[] {
  return discrepancies
    .map((item, index) => ({ item, index }))
    .sort((left, right) =>
      SEVERITY_PRIORITY[left.item.severity] -
        SEVERITY_PRIORITY[right.item.severity] ||
      QUALITY_PRIORITY[qualityClassOf(left.item)] -
        QUALITY_PRIORITY[qualityClassOf(right.item)] ||
      left.index - right.index
    )
    .map(({ item }) => item);
}

export function minecraftQualityFocus(
  discrepancies: readonly VerificationDiscrepancy[]
): {
  code: string;
  severity: VerificationDiscrepancy["severity"];
  quality_class: MinecraftQualityClass;
  owner: MinecraftQualityOwner;
  cause_family: string | null;
  views: ModelView[];
  evidence_targets: VisualEvidenceTarget[];
} | null {
  const focus = prioritizeMinecraftDiscrepancies(discrepancies)[0];
  if (!focus) return null;
  return {
    code: focus.code,
    severity: focus.severity,
    quality_class: qualityClassOf(focus),
    owner: focus.owner ?? "UNKNOWN",
    cause_family: focus.cause_family?.trim() || null,
    views: [...(focus.views ?? [])],
    evidence_targets: [...(focus.evidence_targets ?? [])],
  };
}

export function compactVerificationEvidence(
  request: VerificationEvidenceRequest,
  handle: VerificationEvidenceHandle,
  discrepancies: readonly VerificationDiscrepancy[]
): CompactVerificationEvidence {
  const prioritized = prioritizeMinecraftDiscrepancies(discrepancies);
  const bounded = prioritized.slice(0, MAX_DISCREPANCIES);
  const state = discrepancies.some((item) => item.severity === "BLOCKING")
    ? "BLOCKED"
    : discrepancies.some((item) => item.severity === "REVIEW")
      ? "REVIEW_REQUIRED"
      : "CLEAR";

  return {
    evidence_handle: handle,
    domain: request.domain,
    source: request.source,
    state,
    discrepancy_count: discrepancies.length,
    discrepancies: bounded,
  };
}
