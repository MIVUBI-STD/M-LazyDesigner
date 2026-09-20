export type EfficiencyDomain =
  | "GEOMETRY"
  | "RIGGING"
  | "ANIMATION"
  | "TEXTURING"
  | "INSPECTION";

export type EfficiencyStepKind =
  | "search"
  | "describe"
  | "inspect"
  | "mutate"
  | "verify"
  | "recovery";

export type EfficiencyStep = Readonly<{
  kind: EfficiencyStepKind;
  payload_bytes: number;
  required_for_decision: boolean;
}>;

export type EfficiencyWorkflowInput = Readonly<{
  id: string;
  domain: EfficiencyDomain;
  baseline: readonly EfficiencyStep[];
  optimized: readonly EfficiencyStep[];
  quality_checks: Readonly<Record<string, boolean>>;
}>;

export type EfficiencyWorkflowScore = Readonly<{
  id: string;
  domain: EfficiencyDomain;
  baseline_calls: number;
  optimized_calls: number;
  saved_calls: number;
  call_reduction_percent: number;
  baseline_payload_bytes: number;
  optimized_payload_bytes: number;
  saved_payload_bytes: number;
  payload_reduction_percent: number;
  baseline_mutation_calls: number;
  optimized_mutation_calls: number;
  baseline_inspection_calls: number;
  optimized_inspection_calls: number;
  baseline_verification_calls: number;
  optimized_verification_calls: number;
  redundant_baseline_calls: number;
  quality_preserved: boolean;
}>;

function countKind(
  steps: readonly EfficiencyStep[],
  kind: EfficiencyStepKind
): number {
  return steps.filter((step) => step.kind === kind).length;
}

function percent(before: number, after: number): number {
  if (before <= 0) return 0;
  return Number((((before - after) / before) * 100).toFixed(2));
}

function totalPayload(steps: readonly EfficiencyStep[]): number {
  return steps.reduce((sum, step) => sum + step.payload_bytes, 0);
}

export function scoreEfficiencyWorkflow(
  input: EfficiencyWorkflowInput
): EfficiencyWorkflowScore {
  const baselinePayload = totalPayload(input.baseline);
  const optimizedPayload = totalPayload(input.optimized);
  const baselineCalls = input.baseline.length;
  const optimizedCalls = input.optimized.length;

  return {
    id: input.id,
    domain: input.domain,
    baseline_calls: baselineCalls,
    optimized_calls: optimizedCalls,
    saved_calls: Math.max(0, baselineCalls - optimizedCalls),
    call_reduction_percent: percent(baselineCalls, optimizedCalls),
    baseline_payload_bytes: baselinePayload,
    optimized_payload_bytes: optimizedPayload,
    saved_payload_bytes: Math.max(0, baselinePayload - optimizedPayload),
    payload_reduction_percent: percent(baselinePayload, optimizedPayload),
    baseline_mutation_calls: countKind(input.baseline, "mutate"),
    optimized_mutation_calls: countKind(input.optimized, "mutate"),
    baseline_inspection_calls: countKind(input.baseline, "inspect"),
    optimized_inspection_calls: countKind(input.optimized, "inspect"),
    baseline_verification_calls: countKind(input.baseline, "verify"),
    optimized_verification_calls: countKind(input.optimized, "verify"),
    redundant_baseline_calls: input.baseline.filter(
      (step) => !step.required_for_decision
    ).length,
    quality_preserved: Object.values(input.quality_checks).every(Boolean),
  };
}

export function aggregateEfficiencyScores(
  scores: readonly EfficiencyWorkflowScore[]
) {
  const baselineCalls = scores.reduce((sum, item) => sum + item.baseline_calls, 0);
  const optimizedCalls = scores.reduce((sum, item) => sum + item.optimized_calls, 0);
  const baselinePayload = scores.reduce(
    (sum, item) => sum + item.baseline_payload_bytes,
    0
  );
  const optimizedPayload = scores.reduce(
    (sum, item) => sum + item.optimized_payload_bytes,
    0
  );

  return {
    workflow_count: scores.length,
    quality_preserved: scores.every((item) => item.quality_preserved),
    baseline_calls: baselineCalls,
    optimized_calls: optimizedCalls,
    saved_calls: Math.max(0, baselineCalls - optimizedCalls),
    call_reduction_percent: percent(baselineCalls, optimizedCalls),
    baseline_payload_bytes: baselinePayload,
    optimized_payload_bytes: optimizedPayload,
    saved_payload_bytes: Math.max(0, baselinePayload - optimizedPayload),
    payload_reduction_percent: percent(baselinePayload, optimizedPayload),
    baseline_mutation_calls: scores.reduce(
      (sum, item) => sum + item.baseline_mutation_calls,
      0
    ),
    optimized_mutation_calls: scores.reduce(
      (sum, item) => sum + item.optimized_mutation_calls,
      0
    ),
    baseline_inspection_calls: scores.reduce(
      (sum, item) => sum + item.baseline_inspection_calls,
      0
    ),
    optimized_inspection_calls: scores.reduce(
      (sum, item) => sum + item.optimized_inspection_calls,
      0
    ),
    baseline_verification_calls: scores.reduce(
      (sum, item) => sum + item.baseline_verification_calls,
      0
    ),
    optimized_verification_calls: scores.reduce(
      (sum, item) => sum + item.optimized_verification_calls,
      0
    ),
  };
}
