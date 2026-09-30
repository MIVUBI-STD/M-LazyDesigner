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
    expect(run.acceptance_evidence.every(
      (entry) => entry.verdict === "UNVERIFIED" && entry.evidence_ref === null
    )).toBe(true);
  });
});