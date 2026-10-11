import { describe, expect, test } from "bun:test";
import { CONTROL_ROUTING_POLICY } from "../../gateway/control/routingPolicy";

describe("Control routing policy ownership", () => {
  test("canonical policy controls bounded Gateway search and direct-first fallback", async () => {
    const [registration, barrel] = await Promise.all([
      Bun.file("gateway/handlers/registerCoreTools.ts").text(),
      Bun.file("gateway/control/index.ts").text(),
    ]);

    expect(CONTROL_ROUTING_POLICY).toMatchObject({
      strategy: "DIRECT_FIRST",
      known_capability: "INVOKE_CAPABILITY",
      unknown_capability: "SEARCH_CAPABILITIES",
      schema_uncertain: "DESCRIBE_CAPABILITY",
      stale_or_lost_context: "STATUS",
      search_limit: 4,
    });
    expect(barrel).toContain("CONTROL_ROUTING_POLICY");
    expect(registration).toContain("CONTROL_ROUTING_POLICY");
    expect(registration).toContain(".default(CONTROL_ROUTING_POLICY.search_limit)");
    expect(registration).not.toContain(".default(4)");
  });
});
