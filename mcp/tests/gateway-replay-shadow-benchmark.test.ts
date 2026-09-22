import { describe, expect, test } from "bun:test";
import { GATEWAY_REPLAY_CORPUS } from "../benchmarks/gatewayReplayCorpus";
import {
  assertGatewayReplayShadow,
  benchmarkGatewayReplayShadow,
} from "../scripts/benchmark-gateway-replay-shadow";

describe("Gateway remote replay shadow benchmark", () => {
  test("corpus covers all required remote decision states", () => {
    const knowledge = new Set(
      GATEWAY_REPLAY_CORPUS.map((item) => item.knowledge)
    );
    for (const required of [
      "KNOWN",
      "UNKNOWN",
      "SCHEMA_STALE",
      "BLOCKED",
      "UNKNOWN_PRECONDITION",
    ]) {
      expect(knowledge.has(required as any)).toBe(true);
    }

    const domains = new Set(GATEWAY_REPLAY_CORPUS.map((item) => item.domain));
    for (const required of [
      "GEOMETRY",
      "TEXTURING",
      "ANIMATION",
      "PARTICLE",
      "MIXED",
      "RECOVERY",
    ]) {
      expect(domains.has(required as any)).toBe(true);
    }
  });

  test("Hybrid-4 saves routing without changing blocked semantics", () => {
    const report = benchmarkGatewayReplayShadow();
    assertGatewayReplayShadow();

    expect(report.savings.client_calls).toBeGreaterThan(0);
    expect(report.savings.routing_calls).toBeGreaterThan(0);
    expect(report.savings.schema_reads).toBeGreaterThan(0);
    expect(report.correctness.blocked_preserved).toBe(true);
    expect(report.correctness.capability_preserved).toBe(true);
  });

  test("non-hot and unknown capabilities remain on stable routing behavior", () => {
    const report = benchmarkGatewayReplayShadow();
    for (const id of [
      "geometry-reparent-nonhot",
      "animation-timeline-nonhot",
      "unknown-capability-fallback",
    ]) {
      const row = report.rows.find((entry) => entry.case_id === id)!;
      expect(row.hybrid.client_calls).toBe(row.stable.client_calls);
      expect(row.hybrid.routing_calls).toBe(row.stable.routing_calls);
    }
  });

  test("known blocked hot paths remain blocked before Runtime invoke", () => {
    const report = benchmarkGatewayReplayShadow();
    for (const id of [
      "texture-template-blocked",
      "recovery-project-not-bound-hot",
    ]) {
      const row = report.rows.find((entry) => entry.case_id === id)!;
      expect(row.stable.blocked).toBe(true);
      expect(row.hybrid.blocked).toBe(true);
      expect(row.hybrid.runtime_invokes).toBe(0);
    }
  });
});
