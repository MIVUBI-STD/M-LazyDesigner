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

  test("Hybrid-4 registration stays explicit, generated-schema-backed, and opt-in", async () => {
    const profile = await Bun.file("gateway/experimental/hybridProfile.ts").text();
    const gatewayIndex = await Bun.file("gateway/index.ts").text();

    expect(profile).toContain('production_default: false');
    expect(profile).toContain('registration_enabled: true');
    expect(profile).toContain('proof_status: "EXPERIMENTAL_REGISTERABLE"');
    const registration = await Bun.file("gateway/experimental/hybridRegistration.ts").text();
    expect(gatewayIndex).toContain("resolveGatewaySurfaceProfile");
    expect(gatewayIndex).toContain("registerExperimentalHybrid4");
    expect(registration).toContain("fromJsonSchema");
    expect(registration).not.toContain("../server/");
    expect(profile).toContain('DEFAULT_GATEWAY_SURFACE_PROFILE: GatewaySurfaceProfile =\n  "stable_four"');
  });
});
