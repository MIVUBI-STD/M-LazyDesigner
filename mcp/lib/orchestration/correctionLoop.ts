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
import type { ModelView } from "@/server/tools/camera";

export type CorrectionLoopHandle = `correctionloop:${string}`;

export type ExecutableGeometryCorrectionFamily =
  | "TRANSLATE"
  | "RESIZE"
  | "ROTATE"
  | "LAYER_OFFSET";

export type GeometryCorrectionPatch = {
  intent: SemanticGeometryEditIntent;
  correction_family?: ExecutableGeometryCorrectionFamily;
  target_discrepancy_codes?: readonly string[];
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
  view_evidence_handles: Partial<Record<ModelView, VerificationEvidenceHandle>>;
  pending_target_discrepancy_codes: string[];
  pending_stale_views: ModelView[];
};

export type CorrectionContinuationMode =
  | "CANDIDATE_CONTEXT"
  | "DECISION_SUMMARY"
  | "VERIFY_PENDING"
  | "PRUNED_READY"
  | "CLEAR"
  | "BLOCKED";

export type CorrectionLoopContinuation = {
  protocol: "lazydesigner-correction-continuation-v1";
  continuation_id: `correctionctx:${string}`;
  mode: Exclude<CorrectionContinuationMode, "DECISION_SUMMARY">;
  handle: CorrectionLoopHandle;
  recipe_id: string;
  attempt: 0 | 1 | 2;
  state: "CLEAR" | "READY" | "VERIFY_PENDING" | "BLOCKED";
  unresolved_count: number;
  unresolved: Array<{
    code: string;
    severity: VerificationDiscrepancy["severity"];
    summary: string;
    views: ModelView[];
    evidence_targets: string[];
  }>;
  unresolved_truncated: boolean;
  fresh_view_evidence: Array<{
    view: ModelView;
    handle: VerificationEvidenceHandle;
  }>;
  verification: {
    pending: boolean;
    target_discrepancy_codes: string[];
    stale_views: ModelView[];
    domain: VerificationEvidenceRequest["domain"];
    source: VerificationEvidenceRequest["source"];
    risk: "LOW" | "MEDIUM" | "HIGH" | null;
  };
};

export type CorrectionContinuationDelivery = {
  continuation_id: CorrectionLoopContinuation["continuation_id"];
  cached: boolean;
  payload: CorrectionLoopContinuation | null;
};

export type CorrectionLoopDecision = {
  handle: CorrectionLoopHandle;
  continuation_mode?: "DECISION_SUMMARY";
  state: "CORRECTION_READY" | "BLOCKED";
  attempt: 1 | 2;
  selected_candidate_id?: string;
  decision_summary?: {
    selected_candidate_id: string;
    rejected_candidate_ids: string[];
    selected_metrics: {
      predicted_error: number;
      mutation_cost: number;
      risk: number;
    };
    solver_score: number;
    candidate_count: number;
    candidate_budget: 1 | 2 | 3;
  };
  next_recipe?: AuthoringRecipe;
  rebuild?: ReturnType<typeof planIncrementalRecipeRebuild>;
  verification_request: VerificationEvidenceRequest;
  reverification_discrepancies?: VerificationDiscrepancy[];
  evidence_reuse?: {
    source_handle: VerificationEvidenceHandle;
    stale_views: ModelView[];
    reusable_views: ModelView[];
    reusable_evidence: Array<{
      view: ModelView;
      handle: VerificationEvidenceHandle;
    }>;
    basis: "TARGETED_VIEW_PROVENANCE" | "CONSERVATIVE_ALL_VIEWS";
  };
  blocked_reason?:
    | "REPEATED_FAILURE_WITHOUT_NEW_EVIDENCE"
    | "CORRECTION_ATTEMPT_LIMIT"
    | "NO_ELIGIBLE_CORRECTION"
    | "CANDIDATE_BUDGET_EXCEEDED"
    | "CORRECTION_FAMILY_MISMATCH";
};

function candidateBudget(
  request: VerificationEvidenceRequest
): 1 | 2 | 3 {
  if (request.domain !== "GEOMETRY") return 1;
  if (request.verification_risk === "HIGH") return 3;
  if (request.verification_risk === "MEDIUM") return 2;
  return 1;
}

function correctionFamilyMatchesOperation(
  family: ExecutableGeometryCorrectionFamily,
  operation: SemanticGeometryEditIntent["operation"]
): boolean {
  if (family === "TRANSLATE") return operation.kind === "TRANSLATE";
  if (family === "RESIZE") return operation.kind === "RESIZE_AXIS";
  if (family === "ROTATE") return operation.kind === "ROTATE_AXIS";
  return (
    operation.kind === "TRANSLATE" ||
    operation.kind === "RESIZE_AXIS" ||
    operation.kind === "INFLATE"
  );
}

function fingerprintEvidence(
  handle: VerificationEvidenceHandle,
  discrepancies: readonly VerificationDiscrepancy[]
): string {
  return createHash("sha256")
    .update(JSON.stringify({ handle, discrepancies }))
    .digest("hex");
}

function correctionContinuationId(
  payload: Omit<CorrectionLoopContinuation, "continuation_id">
): CorrectionLoopContinuation["continuation_id"] {
  return (
    "correctionctx:" +
    createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 20)
  ) as CorrectionLoopContinuation["continuation_id"];
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
      | "attempt"
      | "evidence_fingerprint"
      | "last_attempt_evidence_fingerprint"
      | "view_evidence_handles"
      | "pending_target_discrepancy_codes"
      | "pending_stale_views"
    >
  ): CorrectionLoopHandle {
    const viewEvidenceHandles: Partial<
      Record<ModelView, VerificationEvidenceHandle>
    > = {};
    for (const discrepancy of input.discrepancies) {
      for (const view of discrepancy.views ?? []) {
        viewEvidenceHandles[view] = input.verification_evidence_handle;
      }
    }

    const record: CorrectionLoopRecord = {
      ...structuredClone(input),
      attempt: 0,
      evidence_fingerprint: fingerprintEvidence(
        input.verification_evidence_handle,
        input.discrepancies
      ),
      last_attempt_evidence_fingerprint: null,
      view_evidence_handles: viewEvidenceHandles,
      pending_target_discrepancy_codes: [],
      pending_stale_views: [],
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

  projectContinuation(handle: CorrectionLoopHandle): CorrectionLoopContinuation {
    const record = this.entries.get(handle);
    if (!record) {
      throw new Error(
        "CORRECTION_LOOP_NOT_FOUND: handle expired or belongs to a previous Runtime generation."
      );
    }

    const pendingStale = new Set(record.pending_stale_views);
    const freshViewEvidence = (Object.entries(record.view_evidence_handles) as Array<
      [ModelView, VerificationEvidenceHandle | undefined]
    >)
      .filter(
        (entry): entry is [ModelView, VerificationEvidenceHandle] =>
          entry[1] !== undefined && !pendingStale.has(entry[0])
      )
      .map(([view, evidenceHandle]) => ({
        view,
        handle: evidenceHandle,
      }))
      .sort((a, b) => a.view.localeCompare(b.view));

    const unresolved = record.discrepancies.slice(0, 6).map((item) => ({
      code: item.code,
      severity: item.severity,
      summary:
        item.summary.length <= 160
          ? item.summary
          : item.summary.slice(0, 157) + "...",
      views: [...(item.views ?? [])],
      evidence_targets: [...(item.evidence_targets ?? [])],
    }));

    const pending = record.pending_stale_views.length > 0;
    const state: CorrectionLoopContinuation["state"] =
      pending
        ? "VERIFY_PENDING"
        : record.discrepancies.length === 0
          ? "CLEAR"
          : record.attempt >= 2
            ? "BLOCKED"
            : "READY";
    const mode: CorrectionLoopContinuation["mode"] =
      pending
        ? "VERIFY_PENDING"
        : record.discrepancies.length === 0
          ? "CLEAR"
          : record.attempt >= 2
            ? "BLOCKED"
            : record.attempt === 0
              ? "CANDIDATE_CONTEXT"
              : "PRUNED_READY";

    const payload: Omit<CorrectionLoopContinuation, "continuation_id"> = {
      protocol: "lazydesigner-correction-continuation-v1",
      mode,
      handle,
      recipe_id: record.recipe_id,
      attempt: record.attempt,
      state,
      unresolved_count: record.discrepancies.length,
      unresolved,
      unresolved_truncated: record.discrepancies.length > unresolved.length,
      fresh_view_evidence: freshViewEvidence,
      verification: {
        pending,
        target_discrepancy_codes: [
          ...record.pending_target_discrepancy_codes,
        ],
        stale_views: [...record.pending_stale_views],
        domain: record.verification_request.domain,
        source: record.verification_request.source,
        risk:
          record.verification_request.domain === "GEOMETRY"
            ? record.verification_request.verification_risk
            : null,
      },
    };

    return {
      ...payload,
      continuation_id: correctionContinuationId(payload),
    };
  }

  projectContinuationDelivery(
    handle: CorrectionLoopHandle,
    knownContinuationIds: readonly string[] = []
  ): CorrectionContinuationDelivery {
    const payload = this.projectContinuation(handle);
    const cached = knownContinuationIds.includes(payload.continuation_id);
    return {
      continuation_id: payload.continuation_id,
      cached,
      payload: cached ? null : payload,
    };
  }

  updateEvidence(
    handle: CorrectionLoopHandle,
    evidenceHandle: VerificationEvidenceHandle,
    discrepancies: readonly VerificationDiscrepancy[]
  ): void {
    const record = this.entries.get(handle);
    if (!record) throw new Error("CORRECTION_LOOP_NOT_FOUND: handle expired.");

    const incoming = [...structuredClone(discrepancies)];
    if (record.pending_target_discrepancy_codes.length > 0) {
      const replaced = new Set(record.pending_target_discrepancy_codes);
      const retained = record.discrepancies.filter(
        (item) => !replaced.has(item.code)
      );
      const incomingCodes = new Set(incoming.map((item) => item.code));
      record.discrepancies = [
        ...retained.filter((item) => !incomingCodes.has(item.code)),
        ...incoming,
      ];
    } else {
      record.discrepancies = incoming;
    }

    for (const view of record.pending_stale_views) {
      record.view_evidence_handles[view] = evidenceHandle;
    }
    for (const discrepancy of incoming) {
      for (const view of discrepancy.views ?? []) {
        record.view_evidence_handles[view] = evidenceHandle;
      }
    }

    record.verification_evidence_handle = evidenceHandle;
    record.evidence_fingerprint = fingerprintEvidence(
      evidenceHandle,
      record.discrepancies
    );
    record.pending_target_discrepancy_codes = [];
    record.pending_stale_views = [];
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

    const budget = candidateBudget(record.verification_request);
    if (candidates.length > budget) {
      return {
        handle,
        state: "BLOCKED",
        attempt: Math.min(2, record.attempt + 1) as 1 | 2,
        verification_request: structuredClone(record.verification_request),
        blocked_reason: "CANDIDATE_BUDGET_EXCEEDED",
      };
    }

    const familyMismatch = candidates.some((candidate) => {
      const family = candidate.patch.correction_family;
      return (
        family !== undefined &&
        !correctionFamilyMatchesOperation(family, candidate.patch.intent.operation)
      );
    });
    if (familyMismatch) {
      return {
        handle,
        state: "BLOCKED",
        attempt: Math.min(2, record.attempt + 1) as 1 | 2,
        verification_request: structuredClone(record.verification_request),
        blocked_reason: "CORRECTION_FAMILY_MISMATCH",
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

    const requestedCodes = decision.selected.patch.target_discrepancy_codes;
    let reverificationDiscrepancies = [...record.discrepancies];
    if (requestedCodes !== undefined) {
      const uniqueCodes = [...new Set(requestedCodes)];
      if (uniqueCodes.length === 0) {
        return {
          handle,
          state: "BLOCKED",
          attempt: Math.min(2, record.attempt + 1) as 1 | 2,
          verification_request: structuredClone(record.verification_request),
          blocked_reason: "NO_ELIGIBLE_CORRECTION",
        };
      }
      const byCode = new Map(record.discrepancies.map((item) => [item.code, item]));
      const missing = uniqueCodes.filter((code) => !byCode.has(code));
      if (missing.length > 0) {
        return {
          handle,
          state: "BLOCKED",
          attempt: Math.min(2, record.attempt + 1) as 1 | 2,
          verification_request: structuredClone(record.verification_request),
          blocked_reason: "NO_ELIGIBLE_CORRECTION",
        };
      }
      reverificationDiscrepancies = uniqueCodes.map((code) => byCode.get(code)!);
    }

    const geometryRequest =
      record.verification_request.domain === "GEOMETRY"
        ? record.verification_request
        : null;
    const fallbackViews = geometryRequest?.views ?? [];
    const targetedViews = [
      ...new Set(
        reverificationDiscrepancies.flatMap((item) => item.views ?? [])
      ),
    ];
    const fullEvidenceHasViewProvenance =
      record.discrepancies.length > 0 &&
      record.discrepancies.every(
        (item) => Array.isArray(item.views) && item.views.length > 0
      );
    const targetedEvidenceHasViewProvenance =
      reverificationDiscrepancies.length > 0 &&
      reverificationDiscrepancies.every(
        (item) => Array.isArray(item.views) && item.views.length > 0
      );
    const knownEvidenceViews = fullEvidenceHasViewProvenance
      ? (Object.keys(record.view_evidence_handles) as ModelView[])
      : [];
    const canReuseViews =
      fullEvidenceHasViewProvenance && targetedEvidenceHasViewProvenance;
    const staleViews = canReuseViews ? targetedViews : [...fallbackViews];
    const reusableViews = canReuseViews
      ? knownEvidenceViews.filter((view) => !staleViews.includes(view))
      : [];
    const reusableEvidence = reusableViews.flatMap((view) => {
      const evidenceHandle = record.view_evidence_handles[view];
      return evidenceHandle ? [{ view, handle: evidenceHandle }] : [];
    });

    const nextRecipe = rewriteAuthoringRecipeForSemanticEdit(
      record.base_recipe,
      decision.selected.patch.intent
    );
    const rebuild = planIncrementalRecipeRebuild(record.base_recipe, nextRecipe);
    record.base_recipe = structuredClone(nextRecipe);
    record.attempt = (record.attempt + 1) as 1 | 2;
    record.last_attempt_evidence_fingerprint = record.evidence_fingerprint;
    record.pending_target_discrepancy_codes = reverificationDiscrepancies.map(
      (item) => item.code
    );
    record.pending_stale_views = [...staleViews];

    return {
      handle,
      continuation_mode: "DECISION_SUMMARY",
      state: "CORRECTION_READY",
      attempt: record.attempt,
      selected_candidate_id: decision.selected.id,
      decision_summary: {
        selected_candidate_id: decision.selected.id,
        rejected_candidate_ids: [...decision.rejected_ids],
        selected_metrics: {
          predicted_error: decision.selected.predicted_error,
          mutation_cost: decision.selected.mutation_cost,
          risk: decision.selected.risk,
        },
        solver_score: decision.score,
        candidate_count: candidates.length,
        candidate_budget: budget,
      },
      next_recipe: nextRecipe,
      rebuild,
      verification_request: structuredClone(record.verification_request),
      reverification_discrepancies: structuredClone(reverificationDiscrepancies),
      evidence_reuse: {
        source_handle: record.verification_evidence_handle,
        stale_views: [...staleViews],
        reusable_views: [...reusableViews],
        reusable_evidence: structuredClone(reusableEvidence),
        basis: canReuseViews
          ? "TARGETED_VIEW_PROVENANCE"
          : "CONSERVATIVE_ALL_VIEWS",
      },
    };
  }

  size(): number {
    return this.entries.size;
  }
}
