import { describe, expect, test } from "bun:test";
import {
  compareAcceptedGoldenSessions,
  type FinalGoldenSessionReport,
} from "../scripts/compare-golden-sessions";

function accepted(sha: string, calls: number): FinalGoldenSessionReport {
  return {
    schema: 1,
    report: "golden-session-final",
    task_id: "golden-existing-model-correction",
    source_sha: sha,
    state: "ACCEPTED",
    quality_verdict: "PASS",
    accepted_result: true,
    metrics: {
      tool_calls_to_accepted_result: calls,
      decision_required_calls: calls - 1,
      search_calls: 0,
      describe_calls: 0,
      inspect_calls: 1,
      mutate_calls: 1,
      verify_calls: 1,
      recovery_calls: 0,
      redundant_readbacks: 0,
      correction_rounds: 1,
      user_corrections: 1,
      wall_time_ms: 1000,
      accepted_result_ms: 900,
      tool_result_bytes: 4000,
      total_tokens: 5000,
    },
  };
}

describe("accepted golden session comparison", () => {
  test("reports per-metric deltas without aggregate scoring", () => {
    const report = compareAcceptedGoldenSessions({
      baseline: accepted(
        "1234567890abcdef1234567890abcdef12345678",
        5
      ),
      candidate: accepted(
        "abcdef1234567890abcdef1234567890abcdef12",
        3
      ),
    });

    expect(report.quality_gate).toBe("BOTH_ACCEPTED_PASS");
    expect(
      report.metrics.tool_calls_to_accepted_result
        .delta_candidate_minus_baseline
    ).toBe(-2);
    expect(report).not.toHaveProperty("score");
    expect(report).not.toHaveProperty("winner");
  });

  test("rejects incomplete or cross-task comparisons", () => {
    const incomplete = accepted(
      "1234567890abcdef1234567890abcdef12345678",
      5
    );
    incomplete.state = "INCOMPLETE";

    expect(() =>
      compareAcceptedGoldenSessions({
        baseline: incomplete,
        candidate: accepted(
          "abcdef1234567890abcdef1234567890abcdef12",
          3
        ),
      })
    ).toThrow("ACCEPTED");

    const otherTask = accepted(
      "abcdef1234567890abcdef1234567890abcdef12",
      3
    );
    otherTask.task_id = "golden-prop-chair";

    expect(() =>
      compareAcceptedGoldenSessions({
        baseline: accepted(
          "1234567890abcdef1234567890abcdef12345678",
          5
        ),
        candidate: otherTask,
      })
    ).toThrow("same golden task_id");
  });
});
