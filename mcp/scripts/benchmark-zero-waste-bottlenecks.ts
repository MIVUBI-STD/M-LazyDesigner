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
  removed_calls: number;
  added_calls: number;
  net_call_delta: number;
  baseline_bytes: number;
  optimized_bytes: number;
  removed_bytes: number;
  added_bytes: number;
  net_byte_delta: number;
  byte_share_percent: number;
  removed_byte_share_percent: number;
  redundant_baseline_calls: number;
};

export type BottleneckReport = {
  rows: BottleneckRow[];
  ranking: BottleneckRow[];
  totals: {
    baseline_calls: number;
    optimized_calls: number;
    removed_calls: number;
    added_calls: number;
    net_saved_calls: number;
    baseline_bytes: number;
    optimized_bytes: number;
    removed_bytes: number;
    added_bytes: number;
    net_saved_bytes: number;
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
      removed_calls: 0,
      added_calls: 0,
      net_call_delta: 0,
      baseline_bytes: 0,
      optimized_bytes: 0,
      removed_bytes: 0,
      added_bytes: 0,
      net_byte_delta: 0,
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

  const raw = [...accumulator.values()].map((row) => {
    const netCallDelta = row.baseline_calls - row.optimized_calls;
    return {
      ...row,
      removed_calls: Math.max(0, netCallDelta),
      added_calls: Math.max(0, -netCallDelta),
      net_call_delta: netCallDelta,
      removed_bytes: Math.max(0, row.baseline_bytes - row.optimized_bytes),
      added_bytes: Math.max(0, row.optimized_bytes - row.baseline_bytes),
      net_byte_delta: row.baseline_bytes - row.optimized_bytes,
    };
  });

  const totalBaselineBytes = raw.reduce(
    (sum, row) => sum + row.baseline_bytes,
    0
  );
  const totalRemovedBytes = raw.reduce((sum, row) => sum + row.removed_bytes, 0);

  const rows: BottleneckRow[] = raw.map((row) => ({
    ...row,
    byte_share_percent:
      totalBaselineBytes === 0
        ? 0
        : Number(((row.baseline_bytes / totalBaselineBytes) * 100).toFixed(2)),
    removed_byte_share_percent:
      totalRemovedBytes === 0
        ? 0
        : Number(((row.removed_bytes / totalRemovedBytes) * 100).toFixed(2)),
  }));

  const ranking = [...rows]
    .filter(
      (row) =>
        row.removed_bytes > 0 ||
        row.removed_calls > 0 ||
        row.redundant_baseline_calls > 0
    )
    .sort(
      (left, right) =>
        right.removed_bytes - left.removed_bytes ||
        right.removed_calls - left.removed_calls ||
        right.redundant_baseline_calls - left.redundant_baseline_calls ||
        left.kind.localeCompare(right.kind)
    );

  return {
    rows,
    ranking,
    totals: {
      baseline_calls: rows.reduce((sum, row) => sum + row.baseline_calls, 0),
      optimized_calls: rows.reduce((sum, row) => sum + row.optimized_calls, 0),
      removed_calls: rows.reduce((sum, row) => sum + row.removed_calls, 0),
      added_calls: rows.reduce((sum, row) => sum + row.added_calls, 0),
      net_saved_calls: Math.max(
        0,
        rows.reduce((sum, row) => sum + row.baseline_calls, 0) -
          rows.reduce((sum, row) => sum + row.optimized_calls, 0)
      ),
      baseline_bytes: rows.reduce((sum, row) => sum + row.baseline_bytes, 0),
      optimized_bytes: rows.reduce((sum, row) => sum + row.optimized_bytes, 0),
      removed_bytes: rows.reduce((sum, row) => sum + row.removed_bytes, 0),
      added_bytes: rows.reduce((sum, row) => sum + row.added_bytes, 0),
      net_saved_bytes: Math.max(
        0,
        rows.reduce((sum, row) => sum + row.baseline_bytes, 0) -
          rows.reduce((sum, row) => sum + row.optimized_bytes, 0)
      ),
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
