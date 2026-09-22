import { z } from "zod";
import { toolManifest } from "@/build/docs-manifest";
import { HYBRID_4_EXPERIMENTAL_DIRECT_CAPABILITIES } from "@/gateway/experimental/hybridProfile";
import { GATEWAY_REPLAY_CORPUS } from "@/benchmarks/gatewayReplayCorpus";
import { shadowReplayCaseForDirectSet } from "@/gateway/experimental/shadowRouting";


function toolStaticBytes(name: string): number {
  const spec = toolManifest
    .flatMap((group) => group.tools)
    .find((tool) => tool.name === name);
  if (!spec) {
    throw new Error(
      `Hot-path capability is missing from the canonical docs/static manifest: ${name}`
    );
  }
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

function candidateSavings(): Array<{
  capability: string;
  weighted_preinvoke_calls: number;
  static_bytes: number;
}> {
  const capabilities = [...new Set(
    GATEWAY_REPLAY_CORPUS.map((item) => item.capability)
  )];
  const candidates = capabilities.flatMap((capability) => {
    const spec = toolManifest
      .flatMap((group) => group.tools)
      .find((tool) => tool.name === capability);
    if (!spec) return [];

    const weighted = GATEWAY_REPLAY_CORPUS
      .filter((item) => item.capability === capability)
      .reduce((sum, item) => {
        const row = shadowReplayCaseForDirectSet(item, [capability]);
        return sum + row.routing_saving * item.weight;
      }, 0);
    if (weighted <= 0) return [];

    return [{
      capability,
      weighted_preinvoke_calls: weighted,
      static_bytes: toolStaticBytes(capability),
    }];
  });

  return candidates.sort(
    (left, right) =>
      right.weighted_preinvoke_calls - left.weighted_preinvoke_calls ||
      left.static_bytes - right.static_bytes ||
      left.capability.localeCompare(right.capability)
  );
}

function evaluateHybrid(size: number) {
  const direct = candidateSavings().slice(0, size);
  const directNames = direct.map((item) => item.capability);
  let baselineCalls = 0;
  let hybridCalls = 0;
  let blockedRoutesPreserved = 0;
  let blockedRoutes = 0;

  for (const item of GATEWAY_REPLAY_CORPUS) {
    const row = shadowReplayCaseForDirectSet(item, directNames);
    baselineCalls += row.stable.routing_calls * item.weight;
    hybridCalls += row.hybrid.routing_calls * item.weight;
    if (row.stable.blocked) {
      blockedRoutes += item.weight;
      if (row.blocked_preserved) blockedRoutesPreserved += item.weight;
    }
  }

  const staticBytes = direct.reduce((sum, item) => sum + item.static_bytes, 0);
  const avoidedCalls = baselineCalls - hybridCalls;
  return {
    direct_tool_count: direct.length,
    direct_capabilities: directNames,
    added_static_bytes: staticBytes,
    baseline_weighted_preinvoke_calls: baselineCalls,
    hybrid_weighted_preinvoke_calls: hybridCalls,
    avoided_weighted_preinvoke_calls: avoidedCalls,
    avoided_call_ratio:
      baselineCalls === 0 ? 0 : avoidedCalls / baselineCalls,
    static_bytes_per_avoided_call:
      avoidedCalls === 0 ? null : Math.round(staticBytes / avoidedCalls),
    blocked_routes: blockedRoutes,
    blocked_routes_preserved: blockedRoutesPreserved,
    quality_preserved: blockedRoutes === blockedRoutesPreserved,
  };
}

function paretoFrontier(
  variants: ReturnType<typeof evaluateHybrid>[]
): ReturnType<typeof evaluateHybrid>[] {
  return variants.filter(
    (candidate) =>
      !variants.some(
        (other) =>
          other !== candidate &&
          other.added_static_bytes <= candidate.added_static_bytes &&
          other.hybrid_weighted_preinvoke_calls <=
            candidate.hybrid_weighted_preinvoke_calls &&
          (
            other.added_static_bytes < candidate.added_static_bytes ||
            other.hybrid_weighted_preinvoke_calls <
              candidate.hybrid_weighted_preinvoke_calls
          )
      )
  );
}

function recommendedHybrid(
  variants: ReturnType<typeof evaluateHybrid>[]
): ReturnType<typeof evaluateHybrid> {
  const target = variants
    .filter((variant) => variant.avoided_call_ratio >= 0.5)
    .sort(
      (left, right) =>
        left.added_static_bytes - right.added_static_bytes ||
        right.avoided_call_ratio - left.avoided_call_ratio
    )[0];

  return target ?? [...variants].sort(
    (left, right) =>
      right.avoided_call_ratio - left.avoided_call_ratio ||
      left.added_static_bytes - right.added_static_bytes
  )[0]!;
}

export function benchmarkGatewayHotPathStrategies() {
  const baselineCalls = GATEWAY_REPLAY_CORPUS.reduce(
    (sum, item) =>
      sum +
      shadowReplayCaseForDirectSet(item, []).stable.routing_calls *
        item.weight,
    0
  );
  const variants = [4, 8, 12].map(evaluateHybrid);
  const frontier = paretoFrontier(variants);
  const recommended = recommendedHybrid(frontier);

  return {
    measurement: "gateway-hot-path-strategy-proxy",
    proof_scope:
      "Deterministic architecture proxy over the canonical Gateway replay corpus. Hybrid means the stable four Gateway tools plus selected direct Runtime capability schemas. Measures static schema bytes and weighted routing calls; not live model tokens or Blockbench latency.",
    workload_weight: GATEWAY_REPLAY_CORPUS.reduce(
      (sum, item) => sum + item.weight,
      0
    ),
    excluded_future_capabilities: [
      {
        capability: "manage_uv_layout",
        reason: "pre-owned but intentionally not registered on the current Runtime catalog",
      },
    ],
    stable_four: {
      client_tool_count: 4,
      added_direct_tool_bytes: 0,
      weighted_preinvoke_calls: baselineCalls,
      blocked_routes_preserved: true,
    },
    candidates: candidateSavings(),
    hybrid_variants: variants,
    pareto_frontier: frontier.map((variant) => ({
      direct_tool_count: variant.direct_tool_count,
      added_static_bytes: variant.added_static_bytes,
      hybrid_weighted_preinvoke_calls:
        variant.hybrid_weighted_preinvoke_calls,
      avoided_call_ratio: variant.avoided_call_ratio,
      static_bytes_per_avoided_call:
        variant.static_bytes_per_avoided_call,
    })),
    recommendation: {
      strategy: `HYBRID_${recommended.direct_tool_count}`,
      direct_tool_count: recommended.direct_tool_count,
      direct_capabilities: recommended.direct_capabilities,
      added_static_bytes: recommended.added_static_bytes,
      avoided_call_ratio: recommended.avoided_call_ratio,
      rationale:
        recommended.avoided_call_ratio >= 0.5
          ? "Smallest Pareto-efficient hot set reaching at least 50% weighted pre-invoke call avoidance."
          : "No variant reaches 50%; use the Pareto-efficient variant with the highest measured routing-call coverage.",
    },
  };
}

export function assertGatewayHotPathBenchmark(): void {
  const report = benchmarkGatewayHotPathStrategies();
  for (const variant of report.hybrid_variants) {
    if (!variant.quality_preserved) {
      throw new Error(
        `Hybrid-${variant.direct_tool_count} bypassed prerequisite routing.`
      );
    }
    if (variant.added_static_bytes <= 0) {
      throw new Error(
        `Hybrid-${variant.direct_tool_count} must account for direct schema cost.`
      );
    }
    if (variant.avoided_weighted_preinvoke_calls <= 0) {
      throw new Error(
        `Hybrid-${variant.direct_tool_count} produced no measurable call saving.`
      );
    }
    if (
      variant.hybrid_weighted_preinvoke_calls >
      variant.baseline_weighted_preinvoke_calls
    ) {
      throw new Error(
        `Hybrid-${variant.direct_tool_count} increased routing calls.`
      );
    }
  }

  const largest = report.hybrid_variants.at(-1)!;
  if (largest.avoided_call_ratio < 0.5) {
    throw new Error(
      `Hybrid hot-set coverage regression: avoided ratio ${largest.avoided_call_ratio.toFixed(3)} < 0.5`
    );
  }

  const recommendation = report.hybrid_variants.find(
    (variant) =>
      variant.direct_tool_count === report.recommendation.direct_tool_count
  );
  if (!recommendation) {
    throw new Error("Recommended hybrid is not one of the measured variants.");
  }
  if (
    report.recommendation.strategy === "HYBRID_4" &&
    JSON.stringify(report.recommendation.direct_capabilities) !==
      JSON.stringify(HYBRID_4_EXPERIMENTAL_DIRECT_CAPABILITIES)
  ) {
    throw new Error(
      "Experimental Hybrid-4 profile drifted from the current Pareto recommendation."
    );
  }
  if (!recommendation.quality_preserved) {
    throw new Error("Recommended hybrid does not preserve prerequisite routing.");
  }
  const smallerQualifying = report.hybrid_variants.some(
    (variant) =>
      variant.direct_tool_count < recommendation.direct_tool_count &&
      variant.avoided_call_ratio >= 0.5 &&
      variant.quality_preserved
  );
  if (smallerQualifying) {
    throw new Error(
      "Recommended hybrid is not the smallest measured variant reaching the 50% routing-call target."
    );
  }
}

if (import.meta.main) {
  const report = benchmarkGatewayHotPathStrategies();
  assertGatewayHotPathBenchmark();
  console.log(JSON.stringify(report, null, 2));
}
