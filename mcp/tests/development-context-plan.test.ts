import { describe, expect, test } from "bun:test";
import { buildDevelopmentContextPlan } from "../scripts/plan-development-context";

describe("development context planner", () => {
  test("combines intent routing, bounded symbols and semantic impact", async () => {
    const plan = await buildDevelopmentContextPlan({
      intent: "adjust cube geometry proportions",
      changedPaths: ["mcp/server/tools/cubes.ts"],
      symbolMapMaxBytes: 3000,
      knowledgeTokenBudget: 600,
    });

    expect(plan.routing.domain).toBe("GEOMETRY");
    expect(plan.symbol_map.bytes).toBeLessThanOrEqual(3000);
    expect(plan.read_targets.source).toContain("mcp/server/tools/cubes.ts");
    expect(plan.read_targets.tests).toContain(
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

  test("omits semantic impact when there is no change set", async () => {
    const plan = await buildDevelopmentContextPlan({
      intent: "gateway routing discovery",
      symbolMapMaxBytes: 2500,
    });

    expect(plan.semantic_impact).toBeNull();
    expect(plan.read_targets.source.length).toBeGreaterThan(0);
  });
});
