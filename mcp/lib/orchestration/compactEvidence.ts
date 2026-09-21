import type { VerificationEvidenceHandle } from "@/lib/orchestration/evidenceRegistry";
import type { VerificationEvidenceRequest } from "@/lib/orchestration/evidencePlan";

export type VerificationDiscrepancy = {
  code: string;
  severity: "INFO" | "REVIEW" | "BLOCKING";
  summary: string;
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

export function compactVerificationEvidence(
  request: VerificationEvidenceRequest,
  handle: VerificationEvidenceHandle,
  discrepancies: readonly VerificationDiscrepancy[]
): CompactVerificationEvidence {
  const bounded = discrepancies.slice(0, MAX_DISCREPANCIES);
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
