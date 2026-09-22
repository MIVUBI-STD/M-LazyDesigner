import { describe, expect, test } from "bun:test";

describe("Gateway typed output registration", () => {
  test("status, search and describe register output schemas while invoke remains dynamic", async () => {
    const source = await Bun.file("gateway/index.ts").text();

    for (const schema of [
      "gatewayStatusOutputSchema",
      "gatewaySearchOutputSchema",
      "gatewayDescribeOutputSchema",
    ]) {
      expect(source).toContain(`outputSchema: ${schema}`);
    }

    const invokeStart = source.indexOf("GATEWAY_TOOLS.invokeCapability");
    const invokeBlock = source.slice(invokeStart, invokeStart + 900);
    expect(invokeBlock).not.toContain("outputSchema:");
  });
});
