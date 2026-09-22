import { describe, expect, test } from "bun:test";
import {
  evaluateSemanticFreshness,
  semanticRevisionStamp,
} from "../gateway/development/semanticFreshness";

const revisions = {
  routing: "routing-v1",
  graph: "graph-v1",
  schema_projection: "schema-v1",
  aggregate: "aggregate-v1",
};

describe("semantic freshness", () => {
  test("is fresh only when every semantic revision matches", () => {
    const report = evaluateSemanticFreshness(revisions, revisions);
    expect(report.status).toBe("FRESH");
    expect(report.stale_dimensions).toEqual([]);
    expect(report.missing_dimensions).toEqual([]);
  });

  test("reports the exact stale dimension", () => {
    const report = evaluateSemanticFreshness(revisions, {
      ...revisions,
      graph: "graph-old",
    });
    expect(report.status).toBe("STALE");
    expect(report.stale_dimensions).toEqual(["graph"]);
  });

  test("missing stamps never count as fresh", () => {
    const report = evaluateSemanticFreshness(revisions, {
      routing: revisions.routing,
    });
    expect(report.status).toBe("MISSING");
    expect(report.missing_dimensions).toEqual([
      "graph",
      "schema_projection",
      "aggregate",
    ]);
  });

  test("revision stamp is deterministic and timestamp-free", () => {
    expect(semanticRevisionStamp(revisions)).toEqual({
      semantic_revision_schema: 1,
      revisions,
    });
  });
});
