import { describe, expect, test } from "bun:test";
import {
  assertSemanticInvalidationBenchmark,
  benchmarkSemanticInvalidationScope,
} from "../scripts/benchmark-semantic-invalidation-scope";

describe("semantic invalidation scope benchmark", () => {
  test("scoped invalidation avoids broad work for isolated dimension changes", () => {
    const report = benchmarkSemanticInvalidationScope();
    assertSemanticInvalidationBenchmark();

    const routing = report.rows.find((row) => row.change === "routing-only")!;
    const graph = report.rows.find((row) => row.change === "graph-only")!;
    const schema = report.rows.find((row) => row.change === "schema-only")!;

    expect(routing.scoped).not.toContain("DESCRIBE_SCHEMA");
    expect(graph.scoped).not.toContain("DOCS_API");
    expect(schema.scoped).not.toContain("AI_CONTEXT");
    expect(report.single_dimension_summary.avoided_surface_work).toBeGreaterThan(0);
  });

  test("all semantic dimensions still fail wide across registered consumers", () => {
    const report = benchmarkSemanticInvalidationScope();
    const all = report.rows.find((row) => row.change === "all-dimensions")!;
    expect(all.scoped_surfaces).toBe(all.broad_surfaces);
    expect(all.avoided_surfaces).toBe(0);
  });
});
