import { describe, expect, test } from "bun:test";
import { buildDevelopmentContextPlan } from "../../scripts/development/plan-development-context";

describe("development context planner", () => {
  test("combines intent routing, bounded symbols and semantic impact", async () => {
    const plan = await buildDevelopmentContextPlan({
      intent: "adjust cube geometry proportions",
      changedPaths: ["mcp/server/tools/geometry/cubes.ts"],
      symbolMapMaxBytes: 3000,
      knowledgeTokenBudget: 600,
    });

    expect(plan.routing.domain).toBe("GEOMETRY");
    expect(plan.symbol_map.bytes).toBeLessThanOrEqual(3000);
    expect(plan.read_targets.source).toContain("mcp/server/tools/geometry/cubes.ts");
    expect(plan.read_targets.anchor_tests).toContain(
      "mcp/tests/model-effectiveness-correction-accuracy.test.ts"
    );
    expect(plan.semantic_impact?.direct_capabilities).toContain("manage_cubes");
    expect(plan.semantic_catalog_revisions.aggregate).toMatch(
      /^[a-f0-9]{64}$/
    );
    expect(
      plan.knowledge_sections.reduce(
        (sum, section) => sum + section.token_proxy,
        0
      )
    ).toBeLessThanOrEqual(600);
  });

  test("direct changed-path ownership outranks ambiguous keyword routing", async () => {
    const plan = await buildDevelopmentContextPlan({
      intent: "geometry texture issue",
      changedPaths: ["mcp/server/tools/geometry/cubes.ts"],
      symbolMapMaxBytes: 2500,
    });

    expect(plan.routing.domain).toBe("GEOMETRY");
    expect(plan.routing.confidence).toBe("EXACT");
    expect(plan.routing.context_strategy).toBe("DIRECT_SOURCE_OWNERS");
    expect(plan.routing.matched_terms).toContain(
      "changed-owner:manage_cubes"
    );
    expect(plan.semantic_impact?.direct_capabilities).toContain("manage_cubes");
    expect(plan.read_targets.source).toContain("mcp/server/tools/geometry/cubes.ts");
    expect(plan.read_targets.source).not.toContain(
      "mcp/server/tools/texture/create.ts"
    );
    expect(plan.read_targets.specialists).toEqual([
      ".agents/skills/lazydesigner-modelling/SKILL.md",
    ]);
  });

  test("omits semantic impact when there is no change set", async () => {
    const plan = await buildDevelopmentContextPlan({
      intent: "gateway routing discovery",
      symbolMapMaxBytes: 2500,
    });

    expect(plan.semantic_impact).toBeNull();
    expect(plan.read_targets.source.length).toBeGreaterThan(0);
  });
});