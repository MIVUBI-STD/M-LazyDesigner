import { GATEWAY_REPLAY_CORPUS } from "../benchmarks/gatewayReplayCorpus";
import {
  hybrid4StaticSchemaBytes,
  shadowReplayCase,
} from "../gateway/experimental/shadowRouting";

export function benchmarkGatewayReplayShadow() {
  const rows = GATEWAY_REPLAY_CORPUS.map(shadowReplayCase);
  const stableCalls = rows.reduce(
    (sum, row) => sum + row.stable.client_calls,
    0
  );
  const hybridCalls = rows.reduce(
    (sum, row) => sum + row.hybrid.client_calls,
    0
  );
  const stableRouting = rows.reduce(
    (sum, row) => sum + row.stable.routing_calls,
    0
  );
  const hybridRouting = rows.reduce(
    (sum, row) => sum + row.hybrid.routing_calls,
    0
  );
  const schemaReadsAvoided = rows.reduce(
    (sum, row) => sum + row.schema_read_saving,
    0
  );

  return {
    measurement: "gateway-replay-shadow",
    proof_scope:
      "Deterministic remote replay of representative Gateway knowledge/precondition states. No live model tokens, Runtime latency, or Blockbench execution are claimed.",
    case_count: rows.length,
    domains: [...new Set(rows.map((row) => row.domain))].sort(),
    hybrid4_static_schema_bytes: hybrid4StaticSchemaBytes(),
    stable_four: {
      client_calls: stableCalls,
      routing_calls: stableRouting,
    },
    hybrid_4: {
      client_calls: hybridCalls,
      routing_calls: hybridRouting,
    },
    savings: {
      client_calls: stableCalls - hybridCalls,
      client_call_ratio:
        stableCalls === 0 ? 0 : (stableCalls - hybridCalls) / stableCalls,
      routing_calls: stableRouting - hybridRouting,
      routing_call_ratio:
        stableRouting === 0
          ? 0
          : (stableRouting - hybridRouting) / stableRouting,
      schema_reads: schemaReadsAvoided,
    },
    correctness: {
      blocked_preserved: rows.every((row) => row.blocked_preserved),
      capability_preserved: rows.every((row) => row.capability_preserved),
    },
    rows,
  };
}

export function assertGatewayReplayShadow(): void {
  const report = benchmarkGatewayReplayShadow();

  if (!report.correctness.blocked_preserved) {
    throw new Error("Hybrid-4 replay changed blocked prerequisite semantics.");
  }
  if (!report.correctness.capability_preserved) {
    throw new Error("Hybrid-4 replay changed terminal capability identity.");
  }
  if (report.savings.client_calls <= 0) {
    throw new Error("Hybrid-4 replay produced no client-call saving.");
  }
  if (report.savings.routing_calls <= 0) {
    throw new Error("Hybrid-4 replay produced no routing-call saving.");
  }
  if (report.savings.client_call_ratio < 0.2) {
    throw new Error(
      `Hybrid-4 replay client-call saving ${report.savings.client_call_ratio.toFixed(3)} < 0.20`
    );
  }
}

if (import.meta.main) {
  const report = benchmarkGatewayReplayShadow();
  assertGatewayReplayShadow();
  console.log(JSON.stringify(report, null, 2));
}
