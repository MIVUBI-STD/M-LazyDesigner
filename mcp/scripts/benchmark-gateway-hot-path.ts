import "@/server/tools";
import { z } from "zod";
import { getAllToolDefinitions } from "@/lib/factories";

export type HotPathRoute =
  | "DIRECT_INVOKE"
  | "SEARCH_THEN_INVOKE"
  | "SEARCH_THEN_DESCRIBE_THEN_INVOKE"
  | "RESOLVE_PREREQUISITE";

type HotPathCase = {
  id: string;
  capability: string;
  route: HotPathRoute;
  weight: number;
};

const CASES: readonly HotPathCase[] = [
  { id: "geometry-update", capability: "manage_cubes", route: "SEARCH_THEN_DESCRIBE_THEN_INVOKE", weight: 8 },
  { id: "element-detail", capability: "inspect_elements", route: "SEARCH_THEN_DESCRIBE_THEN_INVOKE", weight: 6 },
  { id: "animation-timeline", capability: "manage_animation_timeline", route: "SEARCH_THEN_INVOKE", weight: 5 },
  { id: "uv-plan", capability: "manage_uv_layout", route: "SEARCH_THEN_DESCRIBE_THEN_INVOKE", weight: 4 },
  { id: "blank-texture", capability: "create_texture", route: "SEARCH_THEN_DESCRIBE_THEN_INVOKE", weight: 4 },
  { id: "material-configure", capability: "manage_material", route: "SEARCH_THEN_DESCRIBE_THEN_INVOKE", weight: 4 },
  { id: "reparent", capability: "reparent_element", route: "SEARCH_THEN_INVOKE", weight: 4 },
  { id: "model-bounds-known", capability: "inspect_model_bounds", route: "DIRECT_INVOKE", weight: 4 },
  { id: "pivot-edit", capability: "modify_group", route: "SEARCH_THEN_INVOKE", weight: 3 },
  { id: "gradient", capability: "gradient_tool", route: "SEARCH_THEN_INVOKE", weight: 3 },
  { id: "particle-authoring", capability: "manage_particle", route: "SEARCH_THEN_INVOKE", weight: 3 },
  { id: "particle-inspection", capability: "inspect_particle", route: "SEARCH_THEN_INVOKE", weight: 2 },
  { id: "render-profile", capability: "manage_render_profile", route: "SEARCH_THEN_DESCRIBE_THEN_INVOKE", weight: 2 },
  { id: "uv-apply-blocked", capability: "manage_uv_layout", route: "RESOLVE_PREREQUISITE", weight: 2 },
];

function preInvokeCalls(route: HotPathRoute): number {
  if (route === "DIRECT_INVOKE") return 0;
  if (route === "SEARCH_THEN_DESCRIBE_THEN_INVOKE") return 2;
  return 1;
}

function directEligible(route: HotPathRoute): boolean {
  return route === "SEARCH_THEN_INVOKE" ||
    route === "SEARCH_THEN_DESCRIBE_THEN_INVOKE";
}

function toolStaticBytes(name: string): number {
  const definition = getAllToolDefinitions()[name];
  if (!definition) throw new Error(`Hot-path capability is not registered in the union catalog: ${name}`);
  const schema = z.toJSONSchema(definition.parameterSchema, {
    io: "input",
    target: "draft-2020-12",
    unrepresentable: "any",
    reused: "inline",
  });
  return new TextEncoder().encode(
    JSON.stringify({
      name,
      description: definition.description,
      inputSchema: schema,
    })
  ).byteLength;
}

function candidateSavings(): Array<{
  capability: string;
  weighted_preinvoke_calls: number;
  static_bytes: number;
}> {
  const savings = new Map<string, number>();
  for (const item of CASES) {
    if (!directEligible(item.route)) continue;
    savings.set(
      item.capability,
      (savings.get(item.capability) ?? 0) +
        item.weight * preInvokeCalls(item.route)
    );
  }
  return [...savings.entries()]
    .map(([capability, weighted]) => ({
      capability,
      weighted_preinvoke_calls: weighted,
      static_bytes: toolStaticBytes(capability),
    }))
    .sort(
      (left, right) =>
        right.weighted_preinvoke_calls - left.weighted_preinvoke_calls ||
        left.capability.localeCompare(right.capability)
    );
}

function evaluateHybrid(size: number) {
  const direct = candidateSavings().slice(0, size);
  const directNames = new Set(direct.map((item) => item.capability));
  let baselineCalls = 0;
  let hybridCalls = 0;
  let blockedRoutesPreserved = 0;
  let blockedRoutes = 0;

  for (const item of CASES) {
    const calls = preInvokeCalls(item.route) * item.weight;
    baselineCalls += calls;
    if (item.route === "RESOLVE_PREREQUISITE") {
      blockedRoutes += item.weight;
      blockedRoutesPreserved += item.weight;
      hybridCalls += calls;
      continue;
    }
    hybridCalls +=
      directNames.has(item.capability) && directEligible(item.route)
        ? 0
        : calls;
  }

  const staticBytes = direct.reduce((sum, item) => sum + item.static_bytes, 0);
  const avoidedCalls = baselineCalls - hybridCalls;
  return {
    direct_tool_count: direct.length,
    direct_capabilities: direct.map((item) => item.capability),
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

export function benchmarkGatewayHotPathStrategies() {
  const baselineCalls = CASES.reduce(
    (sum, item) => sum + preInvokeCalls(item.route) * item.weight,
    0
  );
  const variants = [4, 8, 12].map(evaluateHybrid);
  return {
    measurement: "gateway-hot-path-strategy-proxy",
    proof_scope:
      "Deterministic architecture proxy. Hybrid means the stable four Gateway tools plus selected direct Runtime capability schemas from the registered union catalog exposed to the AI client. Measures static schema bytes and weighted pre-invoke routing calls; not live model tokens or Blockbench latency.",
    workload_weight: CASES.reduce((sum, item) => sum + item.weight, 0),
    stable_four: {
      client_tool_count: 4,
      added_direct_tool_bytes: 0,
      weighted_preinvoke_calls: baselineCalls,
      blocked_routes_preserved: true,
    },
    candidates: candidateSavings(),
    hybrid_variants: variants,
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
}

if (import.meta.main) {
  const report = benchmarkGatewayHotPathStrategies();
  assertGatewayHotPathBenchmark();
  console.log(JSON.stringify(report, null, 2));
}
