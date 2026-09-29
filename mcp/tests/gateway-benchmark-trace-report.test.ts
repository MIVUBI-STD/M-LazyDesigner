import { describe, expect, test } from "bun:test";
import { summarizeGatewayBenchmarkTrace } from "../scripts/summarize-gateway-benchmark-trace";

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
    expect(report.proof_scope).toContain("does not prove accepted-result quality");
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
