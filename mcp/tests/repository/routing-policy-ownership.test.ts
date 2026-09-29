import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("Control routing policy ownership", () => {
  test("Gateway search default is sourced from canonical Control policy", async () => {
    const [registration, policy, barrel] = await Promise.all([
      source("gateway/handlers/registerCoreTools.ts"),
      source("gateway/control/routingPolicy.ts"),
      source("gateway/control/index.ts"),
    ]);

    expect(policy).toContain("search_limit: 4");
    expect(barrel).toContain("CONTROL_ROUTING_POLICY");
    expect(registration).toContain("CONTROL_ROUTING_POLICY");
    expect(registration).toContain(".default(CONTROL_ROUTING_POLICY.search_limit)");
    expect(registration).not.toContain(".default(4)");
  });

  test("direct-first fallback policy remains bounded", async () => {
    const policy = await source("gateway/control/routingPolicy.ts");
    expect(policy).toContain('strategy: "DIRECT_FIRST"');
    expect(policy).toContain('known_capability: "INVOKE_CAPABILITY"');
    expect(policy).toContain('unknown_capability: "SEARCH_CAPABILITIES"');
    expect(policy).toContain('schema_uncertain: "DESCRIBE_CAPABILITY"');
    expect(policy).toContain('stale_or_lost_context: "STATUS"');
  });
});
