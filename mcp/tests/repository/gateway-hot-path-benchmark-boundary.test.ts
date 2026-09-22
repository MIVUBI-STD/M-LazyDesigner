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
});
