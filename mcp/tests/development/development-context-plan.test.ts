import { describe, expect, test } from "bun:test";
import { buildDevelopmentContextPlan } from "../../scripts/development/plan-development-context";
import { buildAffectedExecutionPlan } from "../../scripts/development/plan-affected-execution";
import { evaluatePreflight } from "../../../.agents/permissions/preflight.mjs";

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

  test("uncertain development intent follows only authored canonical document links", async () => {
    const plan = await buildDevelopmentContextPlan({
      intent: "unclassified repository architecture change",
      symbolMapMaxBytes: 2000,
      knowledgeTokenBudget: 500,
    });
    expect(plan.routing.confidence).toBe("UNRESOLVED");
    expect(plan.documentation_route).toMatchObject({
      authority: "EXPLICIT_MARKDOWN_LINK",
      nodes: [
        "docs/README.md",
        "docs/04-system/README.md",
        "docs/04-system/implementation-map.md",
      ],
      canonical_owner: "docs/04-system/implementation-map.md",
    });
    expect(plan.documentation_route?.edges).toHaveLength(2);
    expect(plan.read_targets.source).toEqual([]);
    expect(plan.knowledge_sections.every(
      (section) => section.source !== "docs/04-system/README.md"
    )).toBe(true);
  });

  test("known source ownership avoids an extra documentation graph traversal", async () => {
    const plan = await buildDevelopmentContextPlan({
      intent: "manage_cubes source issue",
      changedPaths: ["mcp/server/tools/geometry/cubes.ts"],
      symbolMapMaxBytes: 2000,
    });
    expect(plan.routing.confidence).toBe("EXACT");
    expect(plan.documentation_route).toBeNull();
    expect(plan.read_targets.source).toContain("mcp/server/tools/geometry/cubes.ts");
  });

  test("method flow connects exact owner, bounded impact, verifier consumers and Local permission", async () => {
    const changedPath = "mcp/server/tools/geometry/cubes.ts";
    const context = await buildDevelopmentContextPlan({
      intent: "repair manage_cubes regression in canonical Geometry source",
      changedPaths: [changedPath],
      symbolMapMaxBytes: 2000,
      knowledgeTokenBudget: 180,
    });
    const affected = buildAffectedExecutionPlan([changedPath]);
    const explicitScope = {
      lane: "DEVELOPMENT",
      task: "DEVELOP",
      action: "source-write",
      branch: "Local",
      path: changedPath,
      task_scope_paths: [changedPath],
      authorized_scope: true,
    };

    expect(context.routing.domain).toBe("GEOMETRY");
    expect(context.routing.confidence).toBe("EXACT");
    expect(context.documentation_route).toBeNull();
    expect(context.read_targets.source).toContain(changedPath);
    expect(context.read_targets.anchor_tests).toContain(
      "mcp/tests/model-effectiveness-correction-accuracy.test.ts"
    );
    expect(affected.semantic_impact.direct_capabilities).toContain("manage_cubes");
    expect(affected.semantic_impact.affected_anchor_tests).toContain(
      "mcp/tests/model-effectiveness-correction-accuracy.test.ts"
    );
    expect(affected.execution.checks).toContain("PROJECT_GRAPH");
    expect(
      affected.execution.commands.some((command) =>
        command === "bun run verify:project-graph" ||
        command === "bun run verify:full"
      )
    ).toBe(true);

    expect(evaluatePreflight(explicitScope).decision).toBe("allow");
    expect(evaluatePreflight({ ...explicitScope, branch: "main" }).decision).toBe("ask");
    expect(evaluatePreflight({
      ...explicitScope,
      path: "mcp/server/tools/texture/create.ts",
    }).decision).toBe("deny");
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