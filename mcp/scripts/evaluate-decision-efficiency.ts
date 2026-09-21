import "@/server/tools";
import { getEnabledToolDefinitions } from "@/lib/factories";
import {
  searchCapabilityCatalog,
  summarizeCapability,
} from "@/gateway/capabilities/catalog";
import {
  evaluateCapabilityPreconditions,
  type CapabilityFactState,
} from "@/gateway/capabilities/graph";
import {
  projectCapabilitiesForSearch,
  decorateCapabilities,
} from "@/gateway/control";
import type {
  BackendTool,
  CapabilitySummary,
} from "@/gateway/protocol";

type DecisionCase = {
  id: string;
  query: string;
  knownCapability?: string;
  expectedCapability: string;
  expectedBranch?: { field: string; value: string };
  facts: CapabilityFactState;
  expectedRoute:
    | "DIRECT_INVOKE"
    | "SEARCH_THEN_INVOKE"
    | "SEARCH_THEN_DESCRIBE_THEN_INVOKE"
    | "RESOLVE_PREDECESSOR";
};

function runtimeTools(): BackendTool[] {
  return Object.entries(getEnabledToolDefinitions())
    .map(([name, definition]) => ({
      name,
      description: definition.description,
      inputSchema: definition.inputSchema,
      annotations: definition.annotations,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const CASES: readonly DecisionCase[] = [
  {
    id: "known-direct-inspection",
    query: "inspect model bounds",
    knownCapability: "inspect_model_bounds",
    expectedCapability: "inspect_model_bounds",
    facts: { project_bound: true, geometry_available: true },
    expectedRoute: "DIRECT_INVOKE",
  },
  {
    id: "unknown-cube-update",
    query: "make the chair leg taller",
    expectedCapability: "manage_cubes",
    expectedBranch: { field: "operation", value: "update" },
    facts: { project_bound: true, geometry_available: true },
    expectedRoute: "SEARCH_THEN_DESCRIBE_THEN_INVOKE",
  },
  {
    id: "unknown-uv-plan",
    query: "pack uv islands without overlap",
    expectedCapability: "manage_uv_layout",
    expectedBranch: { field: "operation", value: "plan" },
    facts: { project_bound: true, geometry_available: true },
    expectedRoute: "SEARCH_THEN_DESCRIBE_THEN_INVOKE",
  },
  {
    id: "uv-apply-ready",
    query: "apply the existing uv plan",
    expectedCapability: "manage_uv_layout",
    expectedBranch: { field: "operation", value: "apply" },
    facts: {
      project_bound: true,
      geometry_available: true,
      uv_plan_available: true,
    },
    expectedRoute: "SEARCH_THEN_DESCRIBE_THEN_INVOKE",
  },
  {
    id: "uv-apply-blocked",
    query: "apply the existing uv plan",
    expectedCapability: "manage_uv_layout",
    expectedBranch: { field: "operation", value: "apply" },
    facts: {
      project_bound: true,
      geometry_available: true,
      uv_plan_available: false,
    },
    expectedRoute: "RESOLVE_PREDECESSOR",
  },
  {
    id: "texture-variant-blocked",
    query: "make a texture variant from the source texture",
    expectedCapability: "create_texture",
    expectedBranch: { field: "type", value: "variant" },
    facts: {
      project_bound: true,
      texture_available: false,
    },
    expectedRoute: "RESOLVE_PREDECESSOR",
  },
  {
    id: "texture-variant-ready",
    query: "make a texture variant from the source texture",
    expectedCapability: "create_texture",
    expectedBranch: { field: "type", value: "variant" },
    facts: {
      project_bound: true,
      texture_available: true,
    },
    expectedRoute: "SEARCH_THEN_DESCRIBE_THEN_INVOKE",
  },
  {
    id: "known-direct-texture-read",
    query: "read texture",
    knownCapability: "get_texture",
    expectedCapability: "get_texture",
    facts: { project_bound: true, texture_available: true },
    expectedRoute: "DIRECT_INVOKE",
  },
];

function payloadBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function branchMatches(
  result: CapabilitySummary | undefined,
  expected?: { field: string; value: string }
): boolean {
  if (!expected) return true;
  return (
    result?.branch?.field === expected.field &&
    result.branch.value === expected.value
  );
}

function decide(
  tools: readonly BackendTool[],
  testCase: DecisionCase
) {
  if (testCase.knownCapability) {
    const known = tools.find(
      (tool) => tool.name === testCase.knownCapability
    );
    if (!known) {
      throw new Error(
        `Known capability missing: ${testCase.knownCapability}`
      );
    }

    const summary = summarizeCapability(known);
    return {
      route: "DIRECT_INVOKE" as const,
      search_results: [] as CapabilitySummary[],
      selected: summary,
      search_bytes: 0,
      calls_before_invoke: 0,
      blocked_call_avoided: false,
    };
  }

  const results = searchCapabilityCatalog(
    tools,
    testCase.query,
    4,
    { facts: testCase.facts }
  );
  const selected = results[0];
  if (!selected) {
    return {
      route: "SEARCH_THEN_INVOKE" as const,
      search_results: results,
      selected,
      search_bytes: 0,
      calls_before_invoke: 1,
      blocked_call_avoided: false,
    };
  }

  const projected = projectCapabilitiesForSearch(
    decorateCapabilities(results)
  );
  const searchBytes = payloadBytes(projected);
  const readiness = evaluateCapabilityPreconditions(
    selected.capability_id,
    selected.branch,
    testCase.facts
  );

  if (readiness.eligibility === "BLOCKED") {
    return {
      route: "RESOLVE_PREDECESSOR" as const,
      search_results: results,
      selected,
      search_bytes: searchBytes,
      calls_before_invoke: 1,
      blocked_call_avoided: true,
    };
  }

  if (selected.branch) {
    return {
      route: "SEARCH_THEN_DESCRIBE_THEN_INVOKE" as const,
      search_results: results,
      selected,
      search_bytes: searchBytes,
      calls_before_invoke: 2,
      blocked_call_avoided: false,
    };
  }

  return {
    route: "SEARCH_THEN_INVOKE" as const,
    search_results: results,
    selected,
    search_bytes: searchBytes,
    calls_before_invoke: 1,
    blocked_call_avoided: false,
  };
}

const tools = runtimeTools();
let correctCapability = 0;
let correctBranch = 0;
let correctRoute = 0;
let unnecessarySearch = 0;
let unnecessaryDescribe = 0;
let blockedAvoided = 0;
let expectedBlocked = 0;
let totalSearchBytes = 0;
let totalPreInvokeCalls = 0;

const cases = CASES.map((testCase) => {
  const decision = decide(tools, testCase);
  const capabilityCorrect =
    decision.selected?.capability_id === testCase.expectedCapability;
  const branchCorrect =
    capabilityCorrect &&
    branchMatches(decision.selected, testCase.expectedBranch);
  const routeCorrect =
    decision.route === testCase.expectedRoute;

  if (capabilityCorrect) correctCapability += 1;
  if (branchCorrect) correctBranch += 1;
  if (routeCorrect) correctRoute += 1;

  if (
    testCase.expectedRoute === "DIRECT_INVOKE" &&
    decision.route !== "DIRECT_INVOKE"
  ) {
    unnecessarySearch += 1;
  }

  if (
    decision.route === "SEARCH_THEN_DESCRIBE_THEN_INVOKE" &&
    !testCase.expectedBranch
  ) {
    unnecessaryDescribe += 1;
  }

  if (testCase.expectedRoute === "RESOLVE_PREDECESSOR") {
    expectedBlocked += 1;
    if (decision.blocked_call_avoided) blockedAvoided += 1;
  }

  totalSearchBytes += decision.search_bytes;
  totalPreInvokeCalls += decision.calls_before_invoke;

  return {
    id: testCase.id,
    expected: {
      capability: testCase.expectedCapability,
      branch: testCase.expectedBranch ?? null,
      route: testCase.expectedRoute,
    },
    actual: {
      capability: decision.selected?.capability_id ?? null,
      branch: decision.selected?.branch ?? null,
      route: decision.route,
      eligibility: decision.selected?.eligibility ?? "READY",
      predecessor: decision.selected?.predecessor ?? null,
    },
    capability_correct: capabilityCorrect,
    branch_correct: branchCorrect,
    route_correct: routeCorrect,
    search_payload_bytes: decision.search_bytes,
    calls_before_invoke: decision.calls_before_invoke,
    blocked_call_avoided: decision.blocked_call_avoided,
  };
});

const count = CASES.length;
const report = {
  proof:
    "Deterministic Gateway decision-path benchmark. Measures local routing/control behavior only; not live model token telemetry or native Blockbench latency.",
  catalog_tool_count: tools.length,
  case_count: count,
  metrics: {
    capability_accuracy: Number(
      (correctCapability / Math.max(count, 1)).toFixed(4)
    ),
    branch_accuracy: Number(
      (correctBranch / Math.max(count, 1)).toFixed(4)
    ),
    route_accuracy: Number(
      (correctRoute / Math.max(count, 1)).toFixed(4)
    ),
    unnecessary_search_rate: Number(
      (unnecessarySearch / Math.max(count, 1)).toFixed(4)
    ),
    unnecessary_describe_rate: Number(
      (unnecessaryDescribe / Math.max(count, 1)).toFixed(4)
    ),
    blocked_call_avoidance: Number(
      (blockedAvoided / Math.max(expectedBlocked, 1)).toFixed(4)
    ),
    average_search_payload_bytes: Math.round(
      totalSearchBytes / Math.max(count, 1)
    ),
    average_pre_invoke_calls: Number(
      (totalPreInvokeCalls / Math.max(count, 1)).toFixed(3)
    ),
  },
  cases,
};

if (tools.length !== 54) {
  throw new Error(
    `Decision benchmark expected 54 tools, got ${tools.length}`
  );
}
if (report.metrics.capability_accuracy < 1) {
  throw new Error(
    `Decision capability regression: ${report.metrics.capability_accuracy}`
  );
}
if (report.metrics.branch_accuracy < 1) {
  throw new Error(
    `Decision branch regression: ${report.metrics.branch_accuracy}`
  );
}
if (report.metrics.route_accuracy < 1) {
  throw new Error(
    `Decision route regression: ${report.metrics.route_accuracy}`
  );
}
if (report.metrics.unnecessary_search_rate !== 0) {
  throw new Error("Known capability path performed an unnecessary search.");
}
if (report.metrics.unnecessary_describe_rate !== 0) {
  throw new Error("Decision path performed an unnecessary describe.");
}
if (report.metrics.blocked_call_avoidance < 1) {
  throw new Error(
    "Precondition routing failed to avoid a known-blocked invocation."
  );
}
if (report.metrics.average_search_payload_bytes > 1400) {
  throw new Error(
    `Decision search payload exceeded guard: ${report.metrics.average_search_payload_bytes} bytes`
  );
}
if (report.metrics.average_pre_invoke_calls > 1.25) {
  throw new Error(
    `Decision path call overhead regressed: ${report.metrics.average_pre_invoke_calls}`
  );
}

console.log(JSON.stringify(report, null, 2));
