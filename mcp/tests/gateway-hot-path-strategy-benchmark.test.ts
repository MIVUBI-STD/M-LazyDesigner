import { describe, expect, test } from "bun:test";
import {
  assertGatewayHotPathBenchmark,
  benchmarkGatewayHotPathStrategies,
} from "../scripts/benchmark-gateway-hot-path";

describe("Gateway four-tool vs hybrid hot-path benchmark", () => {
  test("hybrid variants trade static schema cost for fewer routing calls", () => {
    const report = benchmarkGatewayHotPathStrategies();
    assertGatewayHotPathBenchmark();

    expect(report.stable_four.client_tool_count).toBe(4);
    for (const variant of report.hybrid_variants) {
      expect(variant.added_static_bytes).toBeGreaterThan(0);
      expect(variant.avoided_weighted_preinvoke_calls).toBeGreaterThan(0);
      expect(variant.quality_preserved).toBe(true);
      expect(variant.blocked_routes_preserved).toBe(variant.blocked_routes);
    }
  });

  test("larger hot sets never increase weighted pre-invoke calls", () => {
    const variants = benchmarkGatewayHotPathStrategies().hybrid_variants;
    for (let index = 1; index < variants.length; index += 1) {
      expect(variants[index]!.hybrid_weighted_preinvoke_calls).toBeLessThanOrEqual(
        variants[index - 1]!.hybrid_weighted_preinvoke_calls
      );
      expect(variants[index]!.added_static_bytes).toBeGreaterThanOrEqual(
        variants[index - 1]!.added_static_bytes
      );
    }
  });

  test("blocked prerequisite cases are never converted into direct calls", () => {
    const variants = benchmarkGatewayHotPathStrategies().hybrid_variants;
    expect(
      variants.every(
        (variant) =>
          variant.blocked_routes_preserved === variant.blocked_routes
      )
    ).toBe(true);
  });
});
