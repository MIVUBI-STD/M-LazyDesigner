import { describe, expect, test } from "bun:test";

describe("Gateway capability discovery contract", () => {
  test("routing invokes known capabilities directly and defers discovery only for unknown/stale capability", async () => {
    const [policy, routedEval, catalog, protocol] = await Promise.all([
      Bun.file("gateway/control/routingPolicy.ts").text(),
      Bun.file("scripts/evaluate-routed-tool-loading.ts").text(),
      Bun.file("gateway/capabilities/catalog.ts").text(),
      Bun.file("gateway/protocol.ts").text(),
    ]);

    expect(policy).toContain('strategy: "DIRECT_FIRST"');
    expect(policy).toContain('known_capability: "INVOKE_CAPABILITY"');
    expect(policy).toContain('unknown_capability: "SEARCH_CAPABILITIES"');
    expect(policy).toContain('schema_uncertain: "DESCRIBE_CAPABILITY"');
    expect(policy).toContain('stale_or_lost_context: "STATUS"');
    expect(policy).toContain("search_limit: 4");
    expect(policy).not.toContain("tool_search");

    expect(catalog).toContain("searchCapabilityCatalog");
    expect(protocol).toContain("CapabilityTier");

    // Native phase-scoped evaluator remains a lower-level discovery benchmark.
    expect(routedEval).toContain("query: testCase.expected");
    expect(routedEval).toContain('routed_query_contract: "<exact_selected_tool_name>"');
    expect(routedEval).toContain("applyMcpToolSurface");
    expect(routedEval).toContain("getMcpSurfaceToolNames");
    expect(routedEval).not.toContain("`${testCase.expected} ${testCase.query}`");
  });
});
