import { describe, expect, test } from "bun:test";
import {
  evaluateSemanticConsumerFreshness,
  semanticRefreshSurfaces,
} from "../gateway/development/semanticFreshness";

const expected = {
  routing: "a".repeat(64),
  graph: "b".repeat(64),
  schema_projection: "c".repeat(64),
  aggregate: "d".repeat(64),
};

describe("semantic consumer freshness", () => {
  test("fresh consumers require no semantic reload", () => {
    const report = evaluateSemanticConsumerFreshness(expected, expected);
    expect(report.status).toBe("FRESH");
    expect(report.refresh_surfaces).toEqual([]);
  });

  test("routing-only staleness refreshes discovery and AI context, not schemas", () => {
    const report = evaluateSemanticConsumerFreshness(expected, {
      ...expected,
      routing: "e".repeat(64),
      aggregate: "f".repeat(64),
    });
    expect(report.refresh_surfaces).toEqual([
      "AI_CONTEXT",
      "CAPABILITY_SEARCH",
    ]);
    expect(report.refresh_surfaces).not.toContain("DESCRIBE_SCHEMA");
  });

  test("schema-only staleness refreshes describe schema only", () => {
    const report = evaluateSemanticConsumerFreshness(expected, {
      ...expected,
      schema_projection: "e".repeat(64),
      aggregate: "f".repeat(64),
    });
    expect(report.refresh_surfaces).toEqual(["DESCRIBE_SCHEMA"]);
  });

  test("aggregate-only mismatch refreshes compact semantic manifest", () => {
    const report = evaluateSemanticConsumerFreshness(expected, {
      ...expected,
      aggregate: "e".repeat(64),
    });
    expect(report.refresh_surfaces).toEqual(["SEMANTIC_MANIFEST"]);
  });

  test("missing dimensions produce the same minimal refresh routing", () => {
    const report = evaluateSemanticConsumerFreshness(expected, {
      routing: expected.routing,
      graph: expected.graph,
    });
    expect(report.status).toBe("MISSING");
    expect(report.refresh_surfaces).toEqual([
      "DESCRIBE_SCHEMA",
    ]);
    expect(semanticRefreshSurfaces(report)).toEqual(["DESCRIBE_SCHEMA"]);
  });
});
