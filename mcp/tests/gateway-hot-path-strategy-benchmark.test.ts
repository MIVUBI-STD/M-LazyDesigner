import { describe, expect, test } from "bun:test";
import {
  assertGatewayHotPathBenchmark,
  benchmarkGatewayHotPathStrategies,
} from "../scripts/benchmark-gateway-hot-path";
import {
  HYBRID_4_EXPERIMENTAL_DIRECT_CAPABILITIES,
  gatewaySurfaceProjection,
  resolveGatewaySurfaceProfile,
} from "../gateway/experimental/hybridProfile";

describe("Gateway four-tool vs hybrid hot-path benchmark", () => {
  test("report keeps the stable four-tool strategy as an explicit baseline", () => {
    const report = benchmarkGatewayHotPathStrategies();
    expect(report.stable_four.client_tool_count).toBe(4);
    expect(report.stable_four.added_direct_tool_bytes).toBe(0);
  });

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

  test("recommendation chooses the smallest safe variant reaching target coverage", () => {
    const report = benchmarkGatewayHotPathStrategies();
    const recommended = report.hybrid_variants.find(
      (variant) =>
        variant.direct_tool_count === report.recommendation.direct_tool_count
    )!;

    expect(recommended.quality_preserved).toBe(true);
    expect(report.pareto_frontier.length).toBeGreaterThan(0);

    if (recommended.avoided_call_ratio >= 0.5) {
      expect(
        report.hybrid_variants.some(
          (variant) =>
            variant.direct_tool_count < recommended.direct_tool_count &&
            variant.avoided_call_ratio >= 0.5
        )
      ).toBe(false);
    }
  });

  test("experimental Hybrid-4 projection stays opt-in and benchmark-aligned", () => {
    const report = benchmarkGatewayHotPathStrategies();
    const projected = gatewaySurfaceProjection("hybrid_4_experimental");

    expect(resolveGatewaySurfaceProfile(undefined)).toBe("stable_four");
    expect(resolveGatewaySurfaceProfile("hybrid_4_experimental")).toBe(
      "hybrid_4_experimental"
    );
    expect(projected.registration_enabled).toBe(true);
    expect(projected.projected_client_tool_count).toBe(8);
    expect(projected.direct_capabilities).toEqual(
      [...HYBRID_4_EXPERIMENTAL_DIRECT_CAPABILITIES]
    );
    expect(report.recommendation.strategy).toBe("HYBRID_4");
    expect(report.recommendation.direct_capabilities).toEqual(
      [...HYBRID_4_EXPERIMENTAL_DIRECT_CAPABILITIES]
    );
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
