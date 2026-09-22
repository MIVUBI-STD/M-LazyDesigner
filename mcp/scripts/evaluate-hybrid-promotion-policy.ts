import { z } from "zod";
import { toolManifest } from "../build/docs-manifest";
import { GATEWAY_REPLAY_CORPUS } from "../benchmarks/gatewayReplayCorpus";
import {
  HYBRID_4_EXPERIMENTAL_DIRECT_CAPABILITIES,
} from "../gateway/experimental/hybridProfile";
import { shadowReplayCaseForDirectSet } from "../gateway/experimental/shadowRouting";

const MAX_DIRECT_TOOLS = 4;
const MIN_SAVED_CLIENT_CALLS = 2;
const MAX_STATIC_BYTES_PER_TOOL = 16_384;
const MAX_TOTAL_STATIC_BYTES = 40_960;

function toolStaticBytes(name: string): number | null {
  const spec = toolManifest
    .flatMap((group) => group.tools)
    .find((tool) => tool.name === name);
  if (!spec) return null;
  const schema = z.toJSONSchema(spec.parameters, {
    io: "input",
    target: "draft-2020-12",
    unrepresentable: "any",
    reused: "inline",
  });
  return new TextEncoder().encode(
    JSON.stringify({
      name,
      description: spec.description,
      inputSchema: schema,
    })
  ).byteLength;
}

function candidateCapabilityNames(): string[] {
  return [...new Set(GATEWAY_REPLAY_CORPUS.map((item) => item.capability))]
    .filter((capability) => toolStaticBytes(capability) !== null)
    .sort((a, b) => a.localeCompare(b));
}

function evaluateCandidate(capability: string) {
  const rows = GATEWAY_REPLAY_CORPUS
    .filter((item) => item.capability === capability)
    .map((item) => shadowReplayCaseForDirectSet(item, [capability]));

  const staticBytes = toolStaticBytes(capability)!;
  const savedClientCalls = rows.reduce(
    (sum, row) => sum + row.call_saving,
    0
  );
  const savedRoutingCalls = rows.reduce(
    (sum, row) => sum + row.routing_saving,
    0
  );
  const blockedPreserved = rows.every((row) => row.blocked_preserved);
  const capabilityPreserved = rows.every((row) => row.capability_preserved);
  const eligible =
    savedClientCalls >= MIN_SAVED_CLIENT_CALLS &&
    staticBytes <= MAX_STATIC_BYTES_PER_TOOL &&
    blockedPreserved &&
    capabilityPreserved;

  return {
    capability,
    replay_cases: rows.length,
    saved_client_calls: savedClientCalls,
    saved_routing_calls: savedRoutingCalls,
    static_bytes: staticBytes,
    static_bytes_per_saved_call:
      savedClientCalls > 0
        ? Math.round(staticBytes / savedClientCalls)
        : null,
    blocked_preserved: blockedPreserved,
    capability_preserved: capabilityPreserved,
    eligible,
  };
}

export function evaluateHybridPromotionPolicy() {
  const candidates = candidateCapabilityNames()
    .map(evaluateCandidate)
    .sort(
      (left, right) =>
        Number(right.eligible) - Number(left.eligible) ||
        right.saved_client_calls - left.saved_client_calls ||
        left.static_bytes - right.static_bytes ||
        left.capability.localeCompare(right.capability)
    );

  const recommended: typeof candidates = [];
  let totalStaticBytes = 0;
  for (const candidate of candidates) {
    if (!candidate.eligible) continue;
    if (recommended.length >= MAX_DIRECT_TOOLS) break;
    if (
      totalStaticBytes + candidate.static_bytes >
      MAX_TOTAL_STATIC_BYTES
    ) {
      continue;
    }
    recommended.push(candidate);
    totalStaticBytes += candidate.static_bytes;
  }

  return {
    measurement: "hybrid-direct-promotion-policy",
    proof_scope:
      "Remote deterministic promotion policy over the representative replay corpus. It does not claim live model latency or Blockbench performance.",
    policy: {
      max_direct_tools: MAX_DIRECT_TOOLS,
      min_saved_client_calls: MIN_SAVED_CLIENT_CALLS,
      max_static_bytes_per_tool: MAX_STATIC_BYTES_PER_TOOL,
      max_total_static_bytes: MAX_TOTAL_STATIC_BYTES,
      require_blocked_preservation: true,
      require_capability_preservation: true,
    },
    candidates,
    recommendation: {
      direct_capabilities: recommended.map((item) => item.capability),
      direct_tool_count: recommended.length,
      total_static_bytes: totalStaticBytes,
      total_saved_client_calls: recommended.reduce(
        (sum, item) => sum + item.saved_client_calls,
        0
      ),
      total_saved_routing_calls: recommended.reduce(
        (sum, item) => sum + item.saved_routing_calls,
        0
      ),
    },
  };
}

export function assertHybridPromotionPolicy(): void {
  const report = evaluateHybridPromotionPolicy();
  const actual = [...HYBRID_4_EXPERIMENTAL_DIRECT_CAPABILITIES].sort();
  const recommended = [...report.recommendation.direct_capabilities].sort();

  if (report.recommendation.direct_tool_count === 0) {
    throw new Error("Promotion policy selected no direct capabilities.");
  }
  if (
    report.recommendation.total_static_bytes >
    report.policy.max_total_static_bytes
  ) {
    throw new Error("Promotion policy exceeded the direct-schema budget.");
  }
  if (JSON.stringify(actual) !== JSON.stringify(recommended)) {
    throw new Error(
      `Hybrid-4 profile drifted from replay promotion policy. expected=${recommended.join(",")} actual=${actual.join(",")}`
    );
  }
}

if (import.meta.main) {
  const report = evaluateHybridPromotionPolicy();
  assertHybridPromotionPolicy();
  console.log(JSON.stringify(report, null, 2));
}
