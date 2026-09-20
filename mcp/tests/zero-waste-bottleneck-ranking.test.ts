import { describe, expect, test } from "bun:test";
import { rankZeroWasteBottlenecks } from "@/scripts/benchmark-zero-waste-bottlenecks";
import { runZeroWasteWorkflowBenchmark } from "@/scripts/benchmark-zero-waste-workflow";

describe("Zero-Waste bottleneck ranking", () => {
  test("ranking reconciles exactly with workflow benchmark totals", () => {
    const report = rankZeroWasteBottlenecks();
    const workflows = runZeroWasteWorkflowBenchmark();

    const baselineCalls = workflows.reduce(
      (sum, item) => sum + item.baseline.calls,
      0
    );
    const optimizedCalls = workflows.reduce(
      (sum, item) => sum + item.optimized.calls,
      0
    );
    const baselineBytes = workflows.reduce(
      (sum, item) => sum + item.baseline.ai_payload_bytes,
      0
    );
    const optimizedBytes = workflows.reduce(
      (sum, item) => sum + item.optimized.ai_payload_bytes,
      0
    );

    expect(report.totals.baseline_calls).toBe(baselineCalls);
    expect(report.totals.optimized_calls).toBe(optimizedCalls);
    expect(report.totals.baseline_bytes).toBe(baselineBytes);
    expect(report.totals.optimized_bytes).toBe(optimizedBytes);
    expect(report.totals.saved_calls).toBe(
      Math.max(0, baselineCalls - optimizedCalls)
    );
    expect(report.totals.saved_bytes).toBe(
      Math.max(0, baselineBytes - optimizedBytes)
    );
  });

  test("only evidence-backed waste categories appear in the actionable ranking", () => {
    const report = rankZeroWasteBottlenecks();

    expect(report.ranking.length).toBeGreaterThan(0);
    for (const row of report.ranking) {
      expect(
        row.saved_bytes > 0 ||
          row.saved_calls > 0 ||
          row.redundant_baseline_calls > 0,
        row.kind
      ).toBe(true);
    }
  });

  test("ranking never treats required verification as removable waste", () => {
    const report = rankZeroWasteBottlenecks();
    const verify = report.rows.find((row) => row.kind === "verify")!;

    expect(verify.baseline_calls).toBeGreaterThan(0);
    expect(verify.optimized_calls).toBe(verify.baseline_calls);
    expect(verify.saved_calls).toBe(0);
    expect(verify.redundant_baseline_calls).toBe(0);
  });

  test("inspection is ranked as call waste only where workflow contracts mark it redundant", () => {
    const report = rankZeroWasteBottlenecks();
    const inspect = report.rows.find((row) => row.kind === "inspect")!;

    expect(inspect.redundant_baseline_calls).toBeGreaterThan(0);
    expect(inspect.saved_calls).toBeGreaterThan(0);
    expect(inspect.optimized_calls).toBeGreaterThan(0);
  });

  test("ranking percentages are descriptive metrics, not acceptance targets", () => {
    const report = rankZeroWasteBottlenecks();
    const byteShare = report.rows.reduce(
      (sum, row) => sum + row.byte_share_percent,
      0
    );

    expect(byteShare).toBeGreaterThan(99);
    expect(byteShare).toBeLessThan(101);
  });
});
