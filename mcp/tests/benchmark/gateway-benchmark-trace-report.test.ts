import { describe, expect, test } from "bun:test";
import { summarizeGatewayBenchmarkTrace } from "../../scripts/reporting/summarize-gateway-benchmark-trace";

const SHA = "1234567890abcdef1234567890abcdef12345678";

function event(sequence: number, kind: "search" | "inspect" | "mutate" | "verify") {
  return JSON.stringify({
    schema: "lazydesigner-gateway-benchmark-trace-v1",
    sequence,
    task_id: "golden-existing-model-correction",
    source_sha: SHA,
    timestamp: "2026-09-29T00:00:00.000Z",
    kind,
    capability: kind === "search" ? null : "manage_cubes",
    success: true,
    latency_ms: 10,
    result_bytes: 100,
    read_only: kind === "inspect" || kind === "verify",
    verification_class: kind === "mutate" ? "visual" : null
  });
}

describe("gateway benchmark trace report", () => {
  test("summarizes objective metadata", () => {
    const report = summarizeGatewayBenchmarkTrace([
      event(0, "search"),
      event(1, "inspect"),
      event(2, "mutate"),
      event(3, "verify")
    ].join("\n"));

    expect(report.calls.total).toBe(4);
    expect(report.calls.search).toBe(1);
    expect(report.calls.inspect).toBe(1);
    expect(report.calls.mutate).toBe(1);
    expect(report.calls.verify).toBe(1);
    expect(report.payload.result_bytes).toBe(400);
    expect(report.latency.total_ms).toBe(40);
    expect(report.latency.p50_ms).toBe(10);
    expect(report.latency.p95_ms).toBe(10);
    expect(report.failures).toEqual({ by_code: {}, unclassified: 0 });
    expect(report.proof_scope).toContain("does not prove accepted-result quality");
  });

  test("computes p50/p95 and distinguishes named failures", () => {
    const rows = [5, 10, 20, 80].map((latency, index) => ({
      ...(JSON.parse(event(index, "mutate")) as Record<string, unknown>),
      latency_ms: latency,
      ...(index === 3 ? { success: false, error_code: "OUTCOME_UNKNOWN" } : {}),
    }));
    const report = summarizeGatewayBenchmarkTrace(rows.map(row => JSON.stringify(row)).join("\n"));
    expect(report.latency).toMatchObject({
      total_ms: 115, max_ms: 80, p50_ms: 10, p95_ms: 80,
    });
    expect(report.failures).toEqual({
      by_code: { OUTCOME_UNKNOWN: 1 },
      unclassified: 0,
    });
  });

  test("rejects private paths masquerading as error codes", () => {
    const row = {
      ...(JSON.parse(event(0, "mutate")) as Record<string, unknown>),
      success: false,
      error_code: "C:/private/path",
    };
    expect(() => summarizeGatewayBenchmarkTrace(JSON.stringify(row))).toThrow("invalid error_code");
  });

  test("rejects non-contiguous sequence", () => {
    expect(() =>
      summarizeGatewayBenchmarkTrace([
        event(0, "search"),
        event(2, "mutate")
      ].join("\n"))
    ).toThrow("sequence must be contiguous");
  });
});