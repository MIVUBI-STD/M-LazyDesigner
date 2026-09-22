import { describe, expect, test } from "bun:test";
import { HYBRID_4_EXPERIMENTAL_DIRECT_CAPABILITIES } from "../gateway/experimental/hybridProfile";
import { HYBRID_4_GENERATED_SCHEMAS } from "../gateway/experimental/generated/hybrid4Schemas";

describe("Hybrid-4 generated schema boundary", () => {
  test("generated direct schemas stay identical to canonical docs API schemas", async () => {
    const api = JSON.parse(await Bun.file("docs/api.json").text()) as {
      tools: Array<{
        name: string;
        description: string;
        annotations?: Record<string, unknown>;
        parameters: Record<string, unknown>;
      }>;
    };

    for (const capability of HYBRID_4_EXPERIMENTAL_DIRECT_CAPABILITIES) {
      const source = api.tools.find((tool) => tool.name === capability);
      expect(source).toBeDefined();
      expect(HYBRID_4_GENERATED_SCHEMAS[capability]).toEqual({
        description: source!.description,
        annotations: source!.annotations ?? {},
        inputSchema: source!.parameters,
      });
    }
  });
});
