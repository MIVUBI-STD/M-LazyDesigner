import { runZeroWasteWorkflowBenchmark } from "./benchmark-zero-waste-workflow";

type StepKind =
  | "status"
  | "search"
  | "describe"
  | "inspect"
  | "mutate"
  | "verify"
  | "recovery";

export type BottleneckRow = {
  kind: StepKind;
  baseline_calls: number;
  optimized_calls: number;
  saved_calls: number;
  baseline_bytes: number;
  optimized_bytes: number;
  saved_bytes: number;
  byte_share_percent: number;
  saved_byte_share_percent: number;
  redundant_baseline_calls: number;
};

export type BottleneckReport = {
  rows: BottleneckRow[];
  ranking: BottleneckRow[];
  totals: {
    baseline_calls: number;
    optimized_calls: number;
    saved_calls: number;
    baseline_bytes: number;
    optimized_bytes: number;
    saved_bytes: number;
    redundant_baseline_calls: number;
  };
};

const STEP_KINDS: StepKind[] = [
  "status",
  "search",
  "describe",
  "inspect",
  "mutate",
  "verify",
  "recovery",
];

export function rankZeroWasteBottlenecks(): BottleneckReport {
  const workflows = runZeroWasteWorkflowBenchmark();
  const accumulator = new Map<
    StepKind,
    Omit<BottleneckRow, "byte_share_percent" | "saved_byte_share_percent">
  >();

  for (const kind of STEP_KINDS) {
    accumulator.set(kind, {
      kind,
      baseline_calls: 0,
      optimized_calls: 0,
      saved_calls: 0,
      baseline_bytes: 0,
      optimized_bytes: 0,
      saved_bytes: 0,
      redundant_baseline_calls: 0,
    });
  }

  for (const workflow of workflows) {
    for (const item of workflow.baseline.steps) {
      const row = accumulator.get(item.kind)!;
      row.baseline_calls += 1;
      row.baseline_bytes += item.ai_payload_bytes;
      if (!item.required_for_decision) row.redundant_baseline_calls += 1;
    }
    for (const item of workflow.optimized.steps) {
      const row = accumulator.get(item.kind)!;
      row.optimized_calls += 1;
      row.optimized_bytes += item.ai_payload_bytes;
    }
  }

  const raw = [...accumulator.values()].map((row) => ({
    ...row,
    saved_calls: Math.max(0, row.baseline_calls - row.optimized_calls),
    saved_bytes: Math.max(0, row.baseline_bytes - row.optimized_bytes),
  }));

  const totalBaselineBytes = raw.reduce(
    (sum, row) => sum + row.baseline_bytes,
    0
  );
  const totalSavedBytes = raw.reduce((sum, row) => sum + row.saved_bytes, 0);

  const rows: BottleneckRow[] = raw.map((row) => ({
    ...row,
    byte_share_percent:
      totalBaselineBytes === 0
        ? 0
        : Number(((row.baseline_bytes / totalBaselineBytes) * 100).toFixed(2)),
    saved_byte_share_percent:
      totalSavedBytes === 0
        ? 0
        : Number(((row.saved_bytes / totalSavedBytes) * 100).toFixed(2)),
  }));

  const ranking = [...rows]
    .filter(
      (row) =>
        row.saved_bytes > 0 ||
        row.saved_calls > 0 ||
        row.redundant_baseline_calls > 0
    )
    .sort(
      (left, right) =>
        right.saved_bytes - left.saved_bytes ||
        right.saved_calls - left.saved_calls ||
        right.redundant_baseline_calls - left.redundant_baseline_calls ||
        left.kind.localeCompare(right.kind)
    );

  return {
    rows,
    ranking,
    totals: {
      baseline_calls: rows.reduce((sum, row) => sum + row.baseline_calls, 0),
      optimized_calls: rows.reduce((sum, row) => sum + row.optimized_calls, 0),
      saved_calls: rows.reduce((sum, row) => sum + row.saved_calls, 0),
      baseline_bytes: rows.reduce((sum, row) => sum + row.baseline_bytes, 0),
      optimized_bytes: rows.reduce((sum, row) => sum + row.optimized_bytes, 0),
      saved_bytes: rows.reduce((sum, row) => sum + row.saved_bytes, 0),
      redundant_baseline_calls: rows.reduce(
        (sum, row) => sum + row.redundant_baseline_calls,
        0
      ),
    },
  };
}

if (import.meta.main) {
  console.log(
    JSON.stringify(
      {
        schema: 1,
        report: "zero-waste-bottleneck-ranking",
        proof_scope:
          "REMOTE_GITHUB deterministic workflow-proxy ranking. Bytes and calls are benchmark fixtures, not Codex Astra token telemetry.",
        ...rankZeroWasteBottlenecks(),
      },
      null,
      2
    )
  );
}
