type Verdict = "PASS" | "FAIL" | "UNVERIFIED";
type Variant = "baseline" | "zero_waste";

type NullableNumber = number | null;

type Usage = {
  total_tokens: NullableNumber;
  input_tokens: NullableNumber;
  cached_input_tokens: NullableNumber;
  output_tokens: NullableNumber;
  reasoning_tokens: NullableNumber;
};

type ModelUsageEvent = Usage & {
  kind: "response" | "compaction";
  cache_missed_tokens?: NullableNumber;
  comparison_reusable_tokens?: NullableNumber;
};

type Calls = {
  total: NullableNumber;
  search: NullableNumber;
  describe: NullableNumber;
  inspect: NullableNumber;
  mutate: NullableNumber;
  verify: NullableNumber;
  recovery: NullableNumber;
};

type UsageRun = {
  task_id: string;
  variant: Variant;
  quality_verdict: Verdict;
  task_success: boolean | null;
  user_corrections: NullableNumber;
  usage: Usage;
  model_events?: ModelUsageEvent[];
  calls: Calls;
};

type UsageDocument = {
  schema: string;
  proof_scope: string;
  source_sha: string | null;
  model: string | null;
  telemetry_source: string | null;
  notes?: string;
  runs: UsageRun[];
};

const VERDICTS = new Set<Verdict>(["PASS", "FAIL", "UNVERIFIED"]);
const VARIANTS = new Set<Variant>(["baseline", "zero_waste"]);
const EVENT_KINDS = new Set<ModelUsageEvent["kind"]>(["response", "compaction"]);
const USAGE_FIELDS: (keyof Usage)[] = [
  "total_tokens",
  "input_tokens",
  "cached_input_tokens",
  "output_tokens",
  "reasoning_tokens",
];
const CALL_FIELDS: (keyof Calls)[] = [
  "total",
  "search",
  "describe",
  "inspect",
  "mutate",
  "verify",
  "recovery",
];

function requireNullableNonNegativeNumber(value: unknown, field: string): asserts value is NullableNumber {
  if (value === null) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be null or a finite non-negative number.`);
  }
}


function validateUsage(usage: Usage, prefix: string): void {
  if (!usage || typeof usage !== "object") {
    throw new Error(`${prefix} is required.`);
  }
  for (const field of USAGE_FIELDS) {
    requireNullableNonNegativeNumber(usage[field], `${prefix}.${field}`);
  }
}

function validateEvent(
  event: ModelUsageEvent,
  runIndex: number,
  eventIndex: number
): void {
  const prefix = `runs[${runIndex}].model_events[${eventIndex}]`;
  if (!event || typeof event !== "object") {
    throw new Error(`${prefix} must be an object.`);
  }
  if (!EVENT_KINDS.has(event.kind)) {
    throw new Error(`${prefix}.kind is invalid.`);
  }
  validateUsage(event, prefix);
  for (const field of ["cache_missed_tokens", "comparison_reusable_tokens"] as const) {
    if (event[field] !== undefined) {
      requireNullableNonNegativeNumber(event[field], `${prefix}.${field}`);
    }
  }
}

export function effectiveTotalTokens(run: UsageRun): number | null {
  const events = run.model_events ?? [];
  if (events.length === 0) return run.usage.total_tokens;
  if (events.some((event) => event.total_tokens === null)) return null;
  return events.reduce((sum, event) => sum + (event.total_tokens as number), 0);
}

function eventDiagnostics(run: UsageRun) {
  const events = run.model_events ?? [];
  return {
    event_count: events.length,
    response_events: events.filter((event) => event.kind === "response").length,
    compaction_events: events.filter((event) => event.kind === "compaction").length,
    cached_input_tokens:
      events.length > 0 && events.every((event) => event.cached_input_tokens !== null)
        ? events.reduce((sum, event) => sum + (event.cached_input_tokens as number), 0)
        : run.usage.cached_input_tokens,
    cache_missed_tokens:
      events.length > 0 && events.every((event) => event.cache_missed_tokens != null)
        ? events.reduce((sum, event) => sum + (event.cache_missed_tokens as number), 0)
        : null,
    comparison_reusable_tokens:
      events.length > 0 && events.every((event) => event.comparison_reusable_tokens != null)
        ? events.reduce((sum, event) => sum + (event.comparison_reusable_tokens as number), 0)
        : null,
  };
}

function validateRun(run: UsageRun, index: number): void {
  if (!run || typeof run !== "object") throw new Error(`runs[${index}] must be an object.`);
  if (typeof run.task_id !== "string" || run.task_id.length === 0) {
    throw new Error(`runs[${index}].task_id must be non-empty.`);
  }
  if (!VARIANTS.has(run.variant)) throw new Error(`runs[${index}].variant is invalid.`);
  if (!VERDICTS.has(run.quality_verdict)) throw new Error(`runs[${index}].quality_verdict is invalid.`);
  if (run.task_success !== null && typeof run.task_success !== "boolean") {
    throw new Error(`runs[${index}].task_success must be boolean or null.`);
  }
  requireNullableNonNegativeNumber(run.user_corrections, `runs[${index}].user_corrections`);
  validateUsage(run.usage, `runs[${index}].usage`);
  if (run.model_events !== undefined) {
    if (!Array.isArray(run.model_events)) {
      throw new Error(`runs[${index}].model_events must be an array.`);
    }
    run.model_events.forEach((event, eventIndex) =>
      validateEvent(event, index, eventIndex)
    );
    const eventTotal = effectiveTotalTokens(run);
    if (
      run.model_events.length > 0 &&
      run.usage.total_tokens !== null &&
      eventTotal !== null &&
      run.usage.total_tokens !== eventTotal
    ) {
      throw new Error(
        `runs[${index}].usage.total_tokens conflicts with summed source-provided model event totals.`
      );
    }
  }
  if (!run.calls || typeof run.calls !== "object") throw new Error(`runs[${index}].calls is required.`);
  for (const field of CALL_FIELDS) {
    requireNullableNonNegativeNumber(run.calls[field], `runs[${index}].calls.${field}`);
  }
}

export function validateAstraUsageDocument(document: UsageDocument): void {
  if (document.schema !== "lazydesigner-astra-usage-v1") {
    throw new Error("Unsupported Astra usage schema.");
  }
  if (!Array.isArray(document.runs) || document.runs.length === 0) {
    throw new Error("At least one usage run is required.");
  }
  document.runs.forEach(validateRun);
}

function pairKey(run: UsageRun): string {
  return run.task_id;
}

function canClaimUsageComparison(baseline: UsageRun, optimized: UsageRun): boolean {
  return (
    baseline.quality_verdict === "PASS" &&
    optimized.quality_verdict === "PASS" &&
    baseline.task_success === true &&
    optimized.task_success === true &&
    effectiveTotalTokens(baseline) !== null &&
    effectiveTotalTokens(optimized) !== null
  );
}

export function summarizeAstraUsage(document: UsageDocument) {
  validateAstraUsageDocument(document);
  const grouped = new Map<string, Partial<Record<Variant, UsageRun>>>();
  for (const run of document.runs) {
    const key = pairKey(run);
    const group = grouped.get(key) ?? {};
    if (group[run.variant]) {
      throw new Error(`Duplicate ${run.variant} run for task ${run.task_id}.`);
    }
    group[run.variant] = run;
    grouped.set(key, group);
  }

  const comparisons = [...grouped.entries()].map(([taskId, pair]) => {
    const baseline = pair.baseline ?? null;
    const optimized = pair.zero_waste ?? null;
    if (!baseline || !optimized) {
      return {
        task_id: taskId,
        comparison_state: "INCOMPLETE_PAIR" as const,
        token_claim_available: false,
        reason: "Both baseline and zero_waste runs are required.",
      };
    }

    const baselineTotal = effectiveTotalTokens(baseline);
    const optimizedTotal = effectiveTotalTokens(optimized);

    if (!canClaimUsageComparison(baseline, optimized)) {
      return {
        task_id: taskId,
        comparison_state: "UNAVAILABLE" as const,
        token_claim_available: false,
        reason:
          "Token comparison requires PASS quality, successful tasks, and source-provided total_tokens on both runs.",
        quality: {
          baseline: baseline.quality_verdict,
          zero_waste: optimized.quality_verdict,
        },
        total_tokens: {
          baseline: baselineTotal,
          zero_waste: optimizedTotal,
        },
        telemetry: {
          baseline: eventDiagnostics(baseline),
          zero_waste: eventDiagnostics(optimized),
        },
      };
    }

    const before = baselineTotal as number;
    const after = optimizedTotal as number;
    const saved = before - after;
    return {
      task_id: taskId,
      comparison_state: "MEASURED" as const,
      token_claim_available: true,
      total_tokens: {
        baseline: before,
        zero_waste: after,
        delta: saved,
        reduction_percent:
          before === 0 ? 0 : Number(((saved / before) * 100).toFixed(2)),
      },
      telemetry: {
        baseline: eventDiagnostics(baseline),
        zero_waste: eventDiagnostics(optimized),
      },
      user_corrections: {
        baseline: baseline.user_corrections,
        zero_waste: optimized.user_corrections,
      },
      calls: {
        baseline: baseline.calls.total,
        zero_waste: optimized.calls.total,
      },
    };
  });

  const measured = comparisons.filter(
    (entry): entry is Extract<(typeof comparisons)[number], { comparison_state: "MEASURED" }> =>
      entry.comparison_state === "MEASURED"
  );

  return {
    schema: 2,
    proof_scope: document.proof_scope,
    source_sha: document.source_sha,
    model: document.model,
    telemetry_source: document.telemetry_source,
    rule:
      "Never derive task total_tokens from input/output/reasoning components. For multi-event tasks, sum only source-provided total_tokens from every response/compaction event after both quality gates PASS.",
    comparisons,
    aggregate: {
      measured_pairs: measured.length,
      token_claim_available: measured.length > 0,
      baseline_total_tokens:
        measured.length > 0
          ? measured.reduce((sum, entry) => sum + entry.total_tokens.baseline, 0)
          : null,
      zero_waste_total_tokens:
        measured.length > 0
          ? measured.reduce((sum, entry) => sum + entry.total_tokens.zero_waste, 0)
          : null,
    },
  };
}

async function main(): Promise<void> {
  const path = process.argv[2];
  if (!path) {
    throw new Error(
      "Usage: bun run eval:astra-usage -- <normalized-usage.json>"
    );
  }
  const file = Bun.file(path);
  if (!(await file.exists())) throw new Error(`Usage file not found: ${path}`);
  const document = (await file.json()) as UsageDocument;
  console.log(JSON.stringify(summarizeAstraUsage(document), null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
