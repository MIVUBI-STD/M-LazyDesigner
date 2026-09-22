import { describe, expect, test } from "bun:test";
import { planAffectedExecution } from "../gateway/development/affectedExecution";
import type { SemanticImpactReport } from "../gateway/development/impact";

function impact(overrides: Partial<SemanticImpactReport> = {}): SemanticImpactReport {
  return {
    changed_paths: [],
    direct_capabilities: [],
    affected_capabilities: [],
    affected_sources: [],
    affected_tests: [],
    affected_specialists: [],
    truncated: false,
    ...overrides,
  };
}

describe("affected execution planner", () => {
  test("selects runtime checks and exact owner tests for a bounded tool change", () => {
    const plan = planAffectedExecution({
      changedPaths: ["mcp/server/tools/cubes.ts"],
      semanticImpact: impact({
        affected_tests: [
          "mcp/tests/model-effectiveness-correction-accuracy.test.ts",
        ],
      }),
    });

    expect(plan.fallback_full_verify).toBe(false);
    expect(plan.checks).toContain("TYPECHECK_RUNTIME");
    expect(plan.checks).toContain("AUDIT_UNUSED_RUNTIME");
    expect(plan.checks).toContain("DOCS_FRESHNESS");
    expect(plan.checks).toContain("AUTHORING_CONTRACTS");
    expect(plan.targeted_tests).toEqual([
      "mcp/tests/model-effectiveness-correction-accuracy.test.ts",
    ]);
    expect(plan.commands.some((command) =>
      command.includes("model-effectiveness-correction-accuracy.test.ts")
    )).toBe(true);
  });

  test("semantic core changes exercise the isolated compiler project", () => {
    const plan = planAffectedExecution({
      changedPaths: ["mcp/lib/semantic/canonical.ts"],
      semanticImpact: impact(),
    });

    expect(plan.checks).toContain("PROJECT_GRAPH");
    expect(plan.commands).toContain("bun run verify:project-graph");
  });

  test("project-owned source uses one strict composite compiler graph", () => {
    for (const path of [
      "mcp/gateway/capabilities/catalog.ts",
      "mcp/server/tools/cubes.ts",
      "mcp/lib/semantic/canonical.ts",
    ]) {
      const plan = planAffectedExecution({
        changedPaths: [path],
        semanticImpact: impact(),
      });

      expect(plan.checks).toContain("PROJECT_GRAPH");
      expect(plan.checks).not.toContain("TYPECHECK_RUNTIME");
      expect(plan.checks).not.toContain("TYPECHECK_GATEWAY");
      expect(plan.checks).not.toContain("AUDIT_UNUSED_RUNTIME");
      expect(plan.checks).not.toContain("AUDIT_UNUSED_GATEWAY");
      expect(plan.commands).toContain("bun run verify:project-graph");
    }
  });

  test("tooling outside the composite graph retains root compiler verification", () => {
    const plan = planAffectedExecution({
      changedPaths: ["mcp/scripts/measure-mcp-efficiency.ts"],
      semanticImpact: impact(),
    });

    expect(plan.checks).toContain("TYPECHECK_RUNTIME");
    expect(plan.checks).toContain("AUDIT_UNUSED_RUNTIME");
    expect(plan.checks).not.toContain("PROJECT_GRAPH");
  });

  test("unmapped, infra, empty-owner, or truncated changes fail safe to the full verifier", () => {
    for (const candidate of [
      planAffectedExecution({
        changedPaths: ["unknown.bin"],
        semanticImpact: impact(),
      }),
      planAffectedExecution({
        changedPaths: ["mcp/package.json"],
        semanticImpact: impact(),
      }),
      planAffectedExecution({
        changedPaths: ["mcp/about.md"],
        semanticImpact: impact(),
      }),
      planAffectedExecution({
        changedPaths: ["mcp/server/tools/cubes.ts"],
        semanticImpact: impact({ truncated: true }),
      }),
    ]) {
      expect(candidate.fallback_full_verify).toBe(true);
      expect(candidate.commands).toEqual(["bun run verify:full"]);
    }
  });
});


