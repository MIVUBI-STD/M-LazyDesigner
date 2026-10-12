import { describe, expect, test } from "bun:test";
import { argsFromCli, projectReaStaticEvidence } from "../../scripts/audit/rea-application";
import { join, parse } from "node:path";

function evidence(coverage: unknown = "complete") {
  return {
    evidence_id: "ev_" + "a".repeat(64),
    operation: "analyze_javascript_application",
    provider: { id: "rea", name: "REA", version: "6.4.0" },
    subject: { format: "asar", digest: { sha256: "b".repeat(64) } },
    normalized_result: { application_graph: { coverage } },
    limitations: [] as string[],
  };
}

describe("optional REA static evidence audit boundary", () => {
  test("retained Evidence respects an absolute filesystem-root output basename", () => {
    const output = join(parse(process.cwd()).root, "rea-static-evidence.json");
    const selection = argsFromCli([process.cwd(), "--retain-evidence", output]);
    expect(selection.retain).toBe(output);
  });


  test("a complete static observation does not prove a working editor or visual quality", () => {
    const report = projectReaStaticEvidence(evidence());
    expect(report).toMatchObject({
      application_graph_coverage: "complete",
      static_evidence_state: "AVAILABLE_NOT_ACCEPTANCE",
      native_blockbench: "NOT_EXECUTED",
      runtime_behavior: "NOT_OBSERVED",
      visual_fidelity: "NOT_EVALUATED",
      source_acceptance: "NOT_EVALUATED",
      evidence_id_check: "FORMAT_ONLY_REA_OWNS_AUTHENTICATION",
    });
  });

  test("partial, unsupported and absent graph evidence remain unresolved", () => {
    const partial = evidence("partial");
    partial.limitations = ["unresolved dynamic module", "unavailable source map"];
    expect(projectReaStaticEvidence(partial)).toMatchObject({
      application_graph_coverage: "partial",
      limitations_count: 2,
      static_evidence_state: "PARTIAL_OR_UNKNOWN",
    });
    expect(projectReaStaticEvidence(evidence({ arbitrary: "label" })).application_graph_coverage)
      .toBe("unknown");
    const absent = evidence();
    absent.normalized_result = {} as typeof absent.normalized_result;
    expect(projectReaStaticEvidence(absent).application_graph_coverage).toBe("unknown");
  });

  test("rejects a wrong operation, bad identity, missing target or invented limitations", () => {
    const wrong = evidence();
    wrong.operation = "capture_electron_scenario";
    expect(() => projectReaStaticEvidence(wrong)).toThrow("REA_EVIDENCE_INVALID");
    const bad = evidence();
    bad.evidence_id = "ev_bad";
    expect(() => projectReaStaticEvidence(bad)).toThrow("REA_EVIDENCE_INVALID");
    const missing = evidence();
    missing.subject.format = "binary";
    expect(() => projectReaStaticEvidence(missing)).toThrow("REA_EVIDENCE_INVALID");
    const corrupt = { ...evidence(), limitations: "none" };
    expect(() => projectReaStaticEvidence(corrupt)).toThrow("REA_EVIDENCE_INVALID");
  });

  test("does not truncate away evidence limitations silently", () => {
    const observed = evidence();
    observed.limitations = Array.from({ length: 10 }, (_, i) => "unknown " + i);
    const report = projectReaStaticEvidence(observed);
    expect(report.limitations_count).toBe(10);
    expect(report.limitations_preview).toHaveLength(8);
    expect(report.limitations_omitted).toBe(2);
    expect(report.static_evidence_state).toBe("PARTIAL_OR_UNKNOWN");
  });
});
