import { describe, expect, test } from "bun:test";
import goldenCorpus from "../fixtures/golden-task-cases.json";
import {
  buildGoldenRunDraft,
  goldenSessionPaths,
} from "../../scripts/reporting/run-golden-benchmark-session";

const task = goldenCorpus.tasks.find(
  (entry) => entry.id === "golden-existing-model-correction"
)!;

describe("golden benchmark session runner", () => {
  test("creates isolated session artifact paths", () => {
    const paths = goldenSessionPaths(
      task.id,
      ".cache/test-golden",
      new Date("2026-09-29T00:00:00.000Z")
    );
    expect(paths.directory).toContain(
      "golden-existing-model-correction-2026-09-29T00-00-00-000Z"
    );
    expect(paths.trace.endsWith("trace.ndjson")).toBe(true);
    expect(paths.trace_report.endsWith("trace-report.json")).toBe(true);
    expect(paths.golden_run_draft.endsWith("golden-run-draft.json")).toBe(true);
  });

  test("does not allow a run to borrow a different task or source SHA", () => {
    const event = {
      schema: "lazydesigner-gateway-benchmark-trace-v1" as const,
      sequence: 0, task_id: task.id,
      source_sha: "1234567890abcdef1234567890abcdef12345678",
      timestamp: "2026-09-29T00:00:00.000Z",
      kind: "mutate" as const, capability: "manage_cubes",
      success: true, latency_ms: 10, result_bytes: 100,
      read_only: false, verification_class: "visual",
    };
    for (const wrong of [
      { ...event, source_sha: "a".repeat(40) },
      { ...event, task_id: "golden-prop-chair" },
    ]) {
      expect(() => buildGoldenRunDraft({
        task, sourceSha: event.source_sha,
        traceEvents: [wrong], wallTimeMs: 100,
      })).toThrow("does not match the selected task_id and source SHA");
    }
  });

  test("draft never claims quality or decision necessity automatically", () => {
    const draft = buildGoldenRunDraft({
      task,
      sourceSha: "1234567890abcdef1234567890abcdef12345678",
      wallTimeMs: 1500,
      traceEvents: [
        {
          schema: "lazydesigner-gateway-benchmark-trace-v1",
          sequence: 0,
          task_id: task.id,
          source_sha: "1234567890abcdef1234567890abcdef12345678",
          timestamp: "2026-09-29T00:00:00.000Z",
          kind: "inspect",
          capability: "inspect_elements",
          success: true,
          latency_ms: 20,
          result_bytes: 200,
          read_only: true,
          verification_class: "focused_read",
        },
      ],
    });

    const run = draft.runs[0]!;
    expect(run.quality_verdict).toBe("UNVERIFIED");
    expect(run.accepted_result).toBeNull();
    expect(run.trace[0]?.required_for_decision).toBeNull();
    expect(run.trace[0]?.success).toBe(true);
    expect(run.acceptance_evidence.find(entry => entry.criterion === "human_acceptance"))
      .toEqual({ criterion: "human_acceptance", verdict: "UNVERIFIED", evidence_ref: null });
    expect(run.acceptance_evidence.every(
      (entry) => entry.verdict === "UNVERIFIED" && entry.evidence_ref === null
    )).toBe(true);
  });
});