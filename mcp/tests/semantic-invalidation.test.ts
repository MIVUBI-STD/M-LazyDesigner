import { describe, expect, test } from "bun:test";
import {
  planSemanticInvalidation,
  semanticInvalidationCommands,
} from "../gateway/development/semanticInvalidation";

describe("semantic invalidation planner", () => {
  test("routing-only change invalidates discovery without schema churn", () => {
    const plan = planSemanticInvalidation([
      {
        id: "branch:manage_cubes/operation=update",
        change: "CHANGED",
        dimensions: ["ROUTING"],
      },
    ]);

    expect(plan.families).toContain("CAPABILITY_SEARCH");
    expect(plan.families).toContain("AI_CONTEXT");
    expect(plan.families).not.toContain("DESCRIBE_SCHEMA");
    expect(plan.checks).toEqual([
      "CAPABILITY_INTELLIGENCE",
      "CAPABILITY_MANIFEST",
      "DECISION_EFFICIENCY",
    ]);
  });

  test("schema-only change selects describe checks without routing eval", () => {
    const plan = planSemanticInvalidation([
      {
        id: "branch:manage_cubes/operation=update",
        change: "CHANGED",
        dimensions: ["SCHEMA_PROJECTION"],
      },
    ]);

    expect(plan.families).toEqual([
      "CAPABILITY_DOCS",
      "DESCRIBE_SCHEMA",
    ]);
    expect(plan.checks).toEqual([
      "CAPABILITY_MANIFEST",
      "DESCRIBE_PAYLOADS",
    ]);
    expect(semanticInvalidationCommands(plan)).toEqual([
      "bun run test:capability-manifest",
      "bun run measure:describe-payloads",
    ]);
  });

  test("added or removed capability fails wide across semantic catalog", () => {
    const plan = planSemanticInvalidation([
      {
        id: "cap:new_capability",
        change: "ADDED",
        dimensions: ["ROUTING", "GRAPH", "SCHEMA_PROJECTION"],
      },
    ]);

    expect(plan.full_catalog_invalidation).toBe(true);
    expect(plan.families).toHaveLength(5);
    expect(plan.checks).toHaveLength(4);
  });

  test("no semantic changes produce no invalidation or commands", () => {
    const plan = planSemanticInvalidation([]);
    expect(plan.changed_ids).toEqual([]);
    expect(plan.families).toEqual([]);
    expect(plan.checks).toEqual([]);
    expect(semanticInvalidationCommands(plan)).toEqual([]);
  });
});
