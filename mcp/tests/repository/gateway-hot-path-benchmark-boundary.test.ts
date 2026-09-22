import { describe, expect, test } from "bun:test";

describe("Gateway hot-path benchmark boundary", () => {
  test("benchmark does not change the production four-tool client surface", async () => {
    const protocol = await Bun.file("gateway/protocol.ts").text();
    const benchmark = await Bun.file("scripts/benchmark-gateway-hot-path.ts").text();

    expect(protocol).toContain('status: "status"');
    expect(protocol).toContain('searchCapabilities: "search_capabilities"');
    expect(protocol).toContain('describeCapability: "describe_capability"');
    expect(protocol).toContain('invokeCapability: "invoke_capability"');
    expect(benchmark).toContain("Deterministic architecture proxy");
    expect(benchmark).not.toContain("registerGatewayTool");
  });

  test("Hybrid-4 stays a projection-only opt-in until safe direct schemas exist", async () => {
    const profile = await Bun.file("gateway/experimental/hybridProfile.ts").text();
    const gatewayIndex = await Bun.file("gateway/index.ts").text();

    expect(profile).toContain('production_default: false');
    expect(profile).toContain('registration_enabled: false');
    expect(profile).toContain('proof_status: "PROJECTION_ONLY"');
    expect(gatewayIndex).not.toContain("HYBRID_4_EXPERIMENTAL_DIRECT_CAPABILITIES");
    expect(gatewayIndex).not.toContain("hybrid_4_experimental");
  });
});
