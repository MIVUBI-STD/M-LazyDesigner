import { createHash } from "node:crypto";
import type { AuthoringRecipe } from "@/lib/authoringRecipe/contracts";
import type { SemanticGeometryEditIntent } from "@/lib/authoringRecipe/semanticEdit";
import { rewriteAuthoringRecipeForSemanticEdit } from "@/lib/authoringRecipe/semanticRewrite";
import { planIncrementalRecipeRebuild } from "@/lib/authoringRecipe/incremental";
import {
  selectLowestCostCorrection,
  type CorrectionCandidate,
  type CorrectionSolverOptions,
} from "@/lib/correctionSolver";
import type { VerificationEvidenceRequest } from "@/lib/orchestration/evidencePlan";
import type { VerificationEvidenceHandle } from "@/lib/orchestration/evidenceRegistry";
import type { VerificationDiscrepancy } from "@/lib/orchestration/compactEvidence";

export type CorrectionLoopHandle = `correctionloop:${string}`;

export type GeometryCorrectionPatch = {
  intent: SemanticGeometryEditIntent;
};

export type CorrectionLoopRecord = {
  recipe_id: string;
  base_recipe: AuthoringRecipe;
  verification_request: VerificationEvidenceRequest;
  verification_evidence_handle: VerificationEvidenceHandle;
  discrepancies: VerificationDiscrepancy[];
  attempt: 0 | 1 | 2;
  evidence_fingerprint: string;
  last_attempt_evidence_fingerprint: string | null;
};

export type CorrectionLoopDecision = {
  handle: CorrectionLoopHandle;
  state: "CORRECTION_READY" | "BLOCKED";
  attempt: 1 | 2;
  selected_candidate_id?: string;
  next_recipe?: AuthoringRecipe;
  rebuild?: ReturnType<typeof planIncrementalRecipeRebuild>;
  verification_request: VerificationEvidenceRequest;
  blocked_reason?:
    | "REPEATED_FAILURE_WITHOUT_NEW_EVIDENCE"
    | "CORRECTION_ATTEMPT_LIMIT"
    | "NO_ELIGIBLE_CORRECTION";
};

function fingerprintEvidence(
  handle: VerificationEvidenceHandle,
  discrepancies: readonly VerificationDiscrepancy[]
): string {
  return createHash("sha256")
    .update(JSON.stringify({ handle, discrepancies }))
    .digest("hex");
}

export class CorrectionLoopRegistry {
  private readonly entries = new Map<CorrectionLoopHandle, CorrectionLoopRecord>();

  constructor(private readonly maxEntries = 8) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > 32) {
      throw new Error("Correction loop registry maxEntries must be 1..32.");
    }
  }

  start(
    input: Omit<
      CorrectionLoopRecord,
      "attempt" | "evidence_fingerprint" | "last_attempt_evidence_fingerprint"
    >
  ): CorrectionLoopHandle {
    const record: CorrectionLoopRecord = {
      ...structuredClone(input),
      attempt: 0,
      evidence_fingerprint: fingerprintEvidence(
        input.verification_evidence_handle,
        input.discrepancies
      ),
      last_attempt_evidence_fingerprint: null,
    };
    const handle = (
      "correctionloop:" +
      createHash("sha256").update(JSON.stringify(record)).digest("hex")
    ) as CorrectionLoopHandle;
    this.entries.delete(handle);
    this.entries.set(handle, record);
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (!oldest) break;
      this.entries.delete(oldest);
    }
    return handle;
  }

  get(handle: CorrectionLoopHandle): CorrectionLoopRecord {
    const record = this.entries.get(handle);
    if (!record) {
      throw new Error(
        "CORRECTION_LOOP_NOT_FOUND: handle expired or belongs to a previous Runtime generation."
      );
    }
    return structuredClone(record);
  }

  updateEvidence(
    handle: CorrectionLoopHandle,
    evidenceHandle: VerificationEvidenceHandle,
    discrepancies: readonly VerificationDiscrepancy[]
  ): void {
    const record = this.entries.get(handle);
    if (!record) throw new Error("CORRECTION_LOOP_NOT_FOUND: handle expired.");
    record.verification_evidence_handle = evidenceHandle;
    record.discrepancies = [...structuredClone(discrepancies)];
    record.evidence_fingerprint = fingerprintEvidence(evidenceHandle, discrepancies);
  }

  planGeometryCorrection(
    handle: CorrectionLoopHandle,
    candidates: readonly CorrectionCandidate<GeometryCorrectionPatch>[],
    options: CorrectionSolverOptions = {}
  ): CorrectionLoopDecision {
    const record = this.entries.get(handle);
    if (!record) throw new Error("CORRECTION_LOOP_NOT_FOUND: handle expired.");

    if (record.attempt >= 2) {
      return {
        handle,
        state: "BLOCKED",
        attempt: 2,
        verification_request: structuredClone(record.verification_request),
        blocked_reason: "CORRECTION_ATTEMPT_LIMIT",
      };
    }

    if (
      record.attempt > 0 &&
      record.last_attempt_evidence_fingerprint === record.evidence_fingerprint
    ) {
      return {
        handle,
        state: "BLOCKED",
        attempt: record.attempt as 1 | 2,
        verification_request: structuredClone(record.verification_request),
        blocked_reason: "REPEATED_FAILURE_WITHOUT_NEW_EVIDENCE",
      };
    }

    let decision;
    try {
      decision = selectLowestCostCorrection(candidates, options);
    } catch {
      return {
        handle,
        state: "BLOCKED",
        attempt: Math.min(2, record.attempt + 1) as 1 | 2,
        verification_request: structuredClone(record.verification_request),
        blocked_reason: "NO_ELIGIBLE_CORRECTION",
      };
    }

    const nextRecipe = rewriteAuthoringRecipeForSemanticEdit(
      record.base_recipe,
      decision.selected.patch.intent
    );
    const rebuild = planIncrementalRecipeRebuild(record.base_recipe, nextRecipe);
    record.base_recipe = structuredClone(nextRecipe);
    record.attempt = (record.attempt + 1) as 1 | 2;
    record.last_attempt_evidence_fingerprint = record.evidence_fingerprint;

    return {
      handle,
      state: "CORRECTION_READY",
      attempt: record.attempt,
      selected_candidate_id: decision.selected.id,
      next_recipe: nextRecipe,
      rebuild,
      verification_request: structuredClone(record.verification_request),
    };
  }

  size(): number {
    return this.entries.size;
  }
}
