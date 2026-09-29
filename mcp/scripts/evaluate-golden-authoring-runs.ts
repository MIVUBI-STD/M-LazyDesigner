import goldenCorpus from "../tests/fixtures/golden-task-cases.json";

export type GoldenQualityVerdict = "PASS" | "FAIL" | "UNVERIFIED";
export type GoldenTraceKind =
  | "search"
  | "describe"
  | "inspect"
  | "mutate"
  | "verify"
  | "recovery";

export type GoldenTraceEvent = {
  index: number;
  kind: GoldenTraceKind;
  capability?: string;
  required_for_decision: boolean;
  result_bytes?: number | null;
  latency_ms?: number | null;
};

export type GoldenAcceptanceEvidence = {
  criterion: string;
  verdict: GoldenQualityVerdict;
  evidence_ref: string | null;
};

export type GoldenAuthoringRun = {
  task_id: string;
  source_sha: string;
  proof_scope: "LOCAL_CODE" | "LIVE_BLOCKBENCH";
  model: string | null;
  quality_verdict: GoldenQualityVerdict;
  accepted_result: boolean | null;
  user_corrections: number | null;
  correction_rounds: number | null;
  wall_time_ms: number | null;
  accepted_result_ms: number | null;
  token_usage?: {
    total_tokens: number | null;
    input_tokens: number | null;
    cached_input_tokens: number | null;
    output_tokens: number | null;
    reasoning_tokens: number | null;
  };
  trace: GoldenTraceEvent[];
  acceptance_evidence: GoldenAcceptanceEvidence[];
};

export type GoldenAuthoringDocument = {
  schema: "lazydesigner-golden-authoring-runs-v1";
  runs: GoldenAuthoringRun[];
};

const taskById = new Map(
  goldenCorpus.tasks.map((task) => [task.id, task] as const)
);

function requireNonNegativeNullable(value: unknown, field: string): void {
  if (value === null) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be null or a finite non-negative number.`);
  }
}

function validateRun(run: GoldenAuthoringRun, index: number): void {
  const prefix = `runs[${index}]`;
  const task = taskById.get(run.task_id);
  if (!task) throw new Error(`${prefix}.task_id is not in the golden task corpus.`);
  if (!/^[0-9a-f]{40}$/.test(run.source_sha)) {
    throw new Error(`${prefix}.source_sha must be an exact 40-character Git SHA.`);
  }
  if (!["LOCAL_CODE", "LIVE_BLOCKBENCH"].includes(run.proof_scope)) {
    throw new Error(`${prefix}.proof_scope is invalid.`);
  }
  if (!["PASS", "FAIL", "UNVERIFIED"].includes(run.quality_verdict)) {
    throw new Error(`${prefix}.quality_verdict is invalid.`);
  }
  if (run.accepted_result !== null && typeof run.accepted_result !== "boolean") {
    throw new Error(`${prefix}.accepted_result must be boolean or null.`);
  }

  requireNonNegativeNullable(run.user_corrections, `${prefix}.user_corrections`);
  requireNonNegativeNullable(run.correction_rounds, `${prefix}.correction_rounds`);
  requireNonNegativeNullable(run.wall_time_ms, `${prefix}.wall_time_ms`);
  requireNonNegativeNullable(run.accepted_result_ms, `${prefix}.accepted_result_ms`);

  if (!Array.isArray(run.trace)) throw new Error(`${prefix}.trace must be an array.`);
  const traceIndices = run.trace.map((event) => event.index);
  if (new Set(traceIndices).size !== traceIndices.length) {
    throw new Error(`${prefix}.trace indices must be unique.`);
  }
  for (const [eventIndex, event] of run.trace.entries()) {
    if (!Number.isInteger(event.index) || event.index < 0) {
      throw new Error(`${prefix}.trace[${eventIndex}].index must be a non-negative integer.`);
    }
    if (!["search", "describe", "inspect", "mutate", "verify", "recovery"].includes(event.kind)) {
      throw new Error(`${prefix}.trace[${eventIndex}].kind is invalid.`);
    }
    if (typeof event.required_for_decision !== "boolean") {
      throw new Error(`${prefix}.trace[${eventIndex}].required_for_decision must be boolean.`);
    }
    if (event.result_bytes !== undefined) {
      requireNonNegativeNullable(event.result_bytes, `${prefix}.trace[${eventIndex}].result_bytes`);
    }
    if (event.latency_ms !== undefined) {
      requireNonNegativeNullable(event.latency_ms, `${prefix}.trace[${eventIndex}].latency_ms`);
    }
  }

  if (!Array.isArray(run.acceptance_evidence)) {
    throw new Error(`${prefix}.acceptance_evidence must be an array.`);
  }
  const evidenceByCriterion = new Map(
    run.acceptance_evidence.map((entry) => [entry.criterion, entry] as const)
  );
  for (const criterion of task.acceptance) {
    if (!evidenceByCriterion.has(criterion)) {
      throw new Error(
        `${prefix}.acceptance_evidence is missing required criterion "${criterion}".`
      );
    }
  }

  if (run.accepted_result === true) {
    if (run.quality_verdict !== "PASS") {
      throw new Error(`${prefix} cannot be accepted unless quality_verdict is PASS.`);
    }
    for (const criterion of task.acceptance) {
      const evidence = evidenceByCriterion.get(criterion)!;
      if (evidence.verdict !== "PASS" || !evidence.evidence_ref) {
        throw new Error(
          `${prefix} accepted result requires PASS evidence_ref for "${criterion}".`
        );
      }
    }
  }

  if (run.accepted_result_ms !== null && run.wall_time_ms !== null &&
      run.accepted_result_ms > run.wall_time_ms) {
    throw new Error(`${prefix}.accepted_result_ms cannot exceed wall_time_ms.`);
  }
}

export function validateGoldenAuthoringDocument(
  document: GoldenAuthoringDocument
): void {
  if (document.schema !== "lazydesigner-golden-authoring-runs-v1") {
    throw new Error("Unsupported golden authoring run schema.");
  }
  if (!Array.isArray(document.runs) || document.runs.length === 0) {
    throw new Error("At least one golden authoring run is required.");
  }
  document.runs.forEach(validateRun);
}

function count(run: GoldenAuthoringRun, kind: GoldenTraceKind): number {
  return run.trace.filter((event) => event.kind === kind).length;
}

function nullableSum(values: Array<number | null | undefined>): number | null {
  if (values.some((value) => value === null || value === undefined)) return null;
  return values.reduce((sum, value) => sum + (value as number), 0);
}

export function summarizeGoldenAuthoringDocument(
  document: GoldenAuthoringDocument
) {
  validateGoldenAuthoringDocument(document);

  const runs = document.runs.map((run) => {
    const task = taskById.get(run.task_id)!;
    const accepted = run.accepted_result === true && run.quality_verdict === "PASS";
    const redundantReadbacks = run.trace.filter(
      (event) => event.kind === "inspect" && event.required_for_decision === false
    ).length;
    const decisionRequiredCalls = run.trace.filter(
      (event) => event.required_for_decision
    ).length;

    return {
      task_id: run.task_id,
      profile: task.profile,
      proof_scope: run.proof_scope,
      source_sha: run.source_sha,
      quality_verdict: run.quality_verdict,
      accepted_result: run.accepted_result,
      metrics_available: accepted,
      metrics: {
        tool_calls_to_accepted_result: accepted ? run.trace.length : null,
        decision_required_calls: accepted ? decisionRequiredCalls : null,
        search_calls: accepted ? count(run, "search") : null,
        describe_calls: accepted ? count(run, "describe") : null,
        inspect_calls: accepted ? count(run, "inspect") : null,
        mutate_calls: accepted ? count(run, "mutate") : null,
        verify_calls: accepted ? count(run, "verify") : null,
        recovery_calls: accepted ? count(run, "recovery") : null,
        redundant_readbacks: accepted ? redundantReadbacks : null,
        correction_rounds: accepted ? run.correction_rounds : null,
        user_corrections: accepted ? run.user_corrections : null,
        wall_time_ms: accepted ? run.wall_time_ms : null,
        accepted_result_ms: accepted ? run.accepted_result_ms : null,
        tool_result_bytes: accepted
          ? nullableSum(run.trace.map((event) => event.result_bytes))
          : null,
        total_tokens: accepted ? run.token_usage?.total_tokens ?? null : null,
      },
    };
  });

  const acceptedRuns = runs.filter((run) => run.metrics_available);
  return {
    schema: 1,
    benchmark: "golden-authoring-cost-to-accepted-result",
    rule:
      "Efficiency metrics are reportable only for exact-SHA runs whose quality verdict is PASS and whose required acceptance criteria have explicit PASS evidence. No aggregate quality score is computed.",
    runs,
    aggregate: {
      total_runs: runs.length,
      accepted_measured_runs: acceptedRuns.length,
      quality_score: null,
      tool_calls_to_accepted_result:
        acceptedRuns.length > 0
          ? acceptedRuns.reduce(
              (sum, run) =>
                sum + (run.metrics.tool_calls_to_accepted_result ?? 0),
              0
            )
          : null,
      correction_rounds:
        acceptedRuns.length > 0 &&
        acceptedRuns.every((run) => run.metrics.correction_rounds !== null)
          ? acceptedRuns.reduce(
              (sum, run) => sum + (run.metrics.correction_rounds ?? 0),
              0
            )
          : null,
      total_tokens:
        acceptedRuns.length > 0 &&
        acceptedRuns.every((run) => run.metrics.total_tokens !== null)
          ? acceptedRuns.reduce(
              (sum, run) => sum + (run.metrics.total_tokens ?? 0),
              0
            )
          : null,
    },
  };
}

async function main(): Promise<void> {
  const path = process.argv[2];
  if (!path) {
    throw new Error(
      "Usage: bun run eval:golden-authoring -- <golden-authoring-runs.json>"
    );
  }
  const file = Bun.file(path);
  if (!(await file.exists())) throw new Error(`Run file not found: ${path}`);
  const document = (await file.json()) as GoldenAuthoringDocument;
  console.log(JSON.stringify(summarizeGoldenAuthoringDocument(document), null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
