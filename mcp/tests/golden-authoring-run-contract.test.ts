import { describe, expect, test } from "bun:test";
import {
  summarizeGoldenAuthoringDocument,
  validateGoldenAuthoringDocument,
  type GoldenAuthoringDocument,
} from "../scripts/evaluate-golden-authoring-runs";

function acceptedRun(): GoldenAuthoringDocument {
  return {
    schema: "lazydesigner-golden-authoring-runs-v1",
    runs: [
      {
        task_id: "golden-existing-model-correction",
        source_sha: "1234567890abcdef1234567890abcdef12345678",
        proof_scope: "LIVE_BLOCKBENCH",
        model: "gpt-5.6-sol",
        pipeline_provenance: {
          reference_package_fingerprint: "a".repeat(64),
          control_task_context_id: "task:1234567890abcdef1234",
          runtime_build_identity: "runtime-build-accepted",
          artifact_revision: "artifact-revision-accepted",
        },
        quality_verdict: "PASS",
        accepted_result: true,
        user_corrections: 1,
        correction_rounds: 1,
        wall_time_ms: 12000,
        accepted_result_ms: 10000,
        token_usage: {
          total_tokens: 4200,
          input_tokens: 3000,
          cached_input_tokens: 1200,
          output_tokens: 800,
          reasoning_tokens: 400,
        },
        trace: [
          {
            index: 0,
            kind: "inspect",
            capability: "inspect_elements",
            required_for_decision: true,
            result_bytes: 900,
            latency_ms: 100,
          },
          {
            index: 1,
            kind: "mutate",
            capability: "manage_cubes",
            required_for_decision: true,
            result_bytes: 1200,
            latency_ms: 180,
          },
          {
            index: 2,
            kind: "verify",
            capability: "capture_model_views",
            required_for_decision: true,
            result_bytes: 2400,
            latency_ms: 350,
          },
        ],
        acceptance_evidence: [
          {
            criterion: "targeted_correction",
            verdict: "PASS",
            evidence_ref: "receipt:manage_cubes:1",
          },
          {
            criterion: "unaffected_state_preserved",
            verdict: "PASS",
            evidence_ref: "inspect:focused:1",
          },
          {
            criterion: "reference_fidelity",
            verdict: "PASS",
            evidence_ref: "visual:front-side:1",
          },
          {
            criterion: "bounded_correction_rounds",
            verdict: "PASS",
            evidence_ref: "trace:rounds:1",
          },
        ],
      },
    ],
  };
}

describe("golden authoring accepted-result benchmark", () => {
  test("reports efficiency only after explicit accepted PASS evidence", () => {
    const summary = summarizeGoldenAuthoringDocument(acceptedRun());
    expect(summary.runs[0]?.metrics_available).toBe(true);
    expect(summary.runs[0]?.metrics.tool_calls_to_accepted_result).toBe(3);
    expect(summary.runs[0]?.metrics.redundant_readbacks).toBe(0);
    expect(summary.runs[0]?.metrics.total_tokens).toBe(4200);
    expect(summary.aggregate.accepted_measured_runs).toBe(1);
    expect(summary.aggregate.quality_score).toBeNull();
  });

  test("rejects accepted-result claims without PASS quality", () => {
    const document = acceptedRun();
    document.runs[0]!.quality_verdict = "UNVERIFIED";
    expect(() => validateGoldenAuthoringDocument(document)).toThrow(
      "cannot be accepted unless quality_verdict is PASS"
    );
  });

  test("rejects accepted-result claims without complete end-to-end provenance", () => {
    const document = acceptedRun();
    document.runs[0]!.pipeline_provenance.runtime_build_identity = null;
    expect(() => validateGoldenAuthoringDocument(document)).toThrow(
      "requires complete Reference → Control → Runtime → artifact provenance"
    );
  });

  test("rejects accepted-result claims with missing evidence references", () => {
    const document = acceptedRun();
    document.runs[0]!.acceptance_evidence[0]!.evidence_ref = null;
    expect(() => validateGoldenAuthoringDocument(document)).toThrow(
      "accepted result requires PASS evidence_ref"
    );
  });

  test("does not expose efficiency metrics for unaccepted runs", () => {
    const document = acceptedRun();
    document.runs[0]!.accepted_result = null;
    document.runs[0]!.quality_verdict = "UNVERIFIED";
    document.runs[0]!.acceptance_evidence =
      document.runs[0]!.acceptance_evidence.map((entry) => ({
        ...entry,
        verdict: "UNVERIFIED",
        evidence_ref: null,
      }));

    const summary = summarizeGoldenAuthoringDocument(document);
    expect(summary.runs[0]?.metrics_available).toBe(false);
    expect(summary.runs[0]?.metrics.tool_calls_to_accepted_result).toBeNull();
    expect(summary.aggregate.accepted_measured_runs).toBe(0);
  });

  test("counts non-decision inspection as redundant readback only after acceptance", () => {
    const document = acceptedRun();
    document.runs[0]!.trace.splice(2, 0, {
      index: 3,
      kind: "inspect",
      capability: "inspect_elements",
      required_for_decision: false,
      result_bytes: 500,
      latency_ms: 80,
    });

    const summary = summarizeGoldenAuthoringDocument(document);
    expect(summary.runs[0]?.metrics.redundant_readbacks).toBe(1);
    expect(summary.runs[0]?.metrics.tool_calls_to_accepted_result).toBe(4);
  });

  test("template remains unmeasured and references a real golden task", async () => {
    const template = await Bun.file(
      "tests/fixtures/golden-authoring-run-template.json"
    ).json() as GoldenAuthoringDocument;
    validateGoldenAuthoringDocument(template);
    expect(template.runs[0]?.accepted_result).toBeNull();
    expect(template.runs[0]?.quality_verdict).toBe("UNVERIFIED");
  });
});
