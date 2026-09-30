import { describe, expect, test } from "bun:test";
import {
  finalizeGoldenSession,
} from "../scripts/reporting/finalize-golden-session";
import type {
  GoldenAuthoringDocument,
} from "../scripts/reporting/evaluate-golden-authoring-runs";
import type {
  UsageDocument,
} from "../scripts/evaluate/validate-astra-usage";

function golden(): GoldenAuthoringDocument {
  return {
    schema: "lazydesigner-golden-authoring-runs-v1",
    runs: [
      {
        task_id: "golden-existing-model-correction",
        source_sha: "1234567890abcdef1234567890abcdef12345678",
        proof_scope: "LIVE_BLOCKBENCH",
        model: null,
        pipeline_provenance: {
          reference_package_fingerprint: null,
          control_task_context_id: null,
          runtime_build_identity: null,
          artifact_revision: null,
        },
        quality_verdict: "UNVERIFIED",
        accepted_result: null,
        user_corrections: null,
        correction_rounds: null,
        wall_time_ms: 1000,
        accepted_result_ms: null,
        token_usage: {
          total_tokens: null,
          input_tokens: null,
          cached_input_tokens: null,
          output_tokens: null,
          reasoning_tokens: null,
        },
        trace: [
          {
            index: 0,
            kind: "inspect",
            capability: "inspect_elements",
            required_for_decision: null,
            result_bytes: 100,
            latency_ms: 10,
          },
        ],
        acceptance_evidence: [
          { criterion: "targeted_correction", verdict: "UNVERIFIED", evidence_ref: null },
          { criterion: "unaffected_state_preserved", verdict: "UNVERIFIED", evidence_ref: null },
          { criterion: "reference_fidelity", verdict: "UNVERIFIED", evidence_ref: null },
          { criterion: "bounded_correction_rounds", verdict: "UNVERIFIED", evidence_ref: null },
        ],
      },
    ],
  };
}

function usage(sourceSha: string): UsageDocument {
  return {
    schema: "lazydesigner-astra-usage-v1",
    proof_scope: "LIVE_BLOCKBENCH",
    source_sha: sourceSha,
    model: "gpt-5.6-sol",
    telemetry_source: "codex",
    runs: [
      {
        task_id: "golden-existing-model-correction",
        variant: "zero_waste",
        quality_verdict: "UNVERIFIED",
        task_success: null,
        accepted_result: null,
        user_corrections: null,
        usage: {
          total_tokens: null,
          input_tokens: null,
          cached_input_tokens: null,
          output_tokens: null,
          reasoning_tokens: null,
        },
        calls: {
          total: 1,
          search: 0,
          describe: 0,
          inspect: 1,
          mutate: 0,
          verify: 0,
          recovery: 0,
        },
      },
    ],
  };
}

describe("golden session finalizer", () => {
  test("keeps an unresolved draft incomplete and withholds metrics", () => {
    const report = finalizeGoldenSession({ golden: golden() });
    expect(report.state).toBe("INCOMPLETE");
    expect(report.metrics).toBeNull();
    expect(report.unresolved).toEqual({
      decision_labels: 1,
      acceptance_evidence: 4,
    });
  });

  test("rejects usage telemetry from a different exact SHA", () => {
    expect(() =>
      finalizeGoldenSession({
        golden: golden(),
        usage: usage("abcdef1234567890abcdef1234567890abcdef12"),
      })
    ).toThrow("does not match golden run");
  });

  test("merges same-SHA telemetry without upgrading quality", () => {
    const report = finalizeGoldenSession({
      golden: golden(),
      usage: usage("1234567890abcdef1234567890abcdef12345678"),
    });
    expect(report.state).toBe("INCOMPLETE");
    expect(report.usage).toMatchObject({
      variant: "zero_waste",
      model: "gpt-5.6-sol",
      telemetry_source: "codex",
      calls_total: 1,
      total_tokens: null,
    });
  });
});