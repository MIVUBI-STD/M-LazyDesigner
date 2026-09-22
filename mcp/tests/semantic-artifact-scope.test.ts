import { describe, expect, test } from "bun:test";
import { evaluateDerivedArtifactFreshness } from "../gateway/development/semanticArtifact";

const expected = {
  routing: "a".repeat(64),
  graph: "b".repeat(64),
  schema_projection: "c".repeat(64),
  aggregate: "d".repeat(64),
};

describe("derived artifact dependency scoping", () => {
  test("docs API ignores routing-only churn", () => {
    const report = evaluateDerivedArtifactFreshness(
      {
        artifact_kind: "DOCS_API",
        revisions: {
          ...expected,
          routing: "e".repeat(64),
          aggregate: "f".repeat(64),
        },
      },
      expected
    );
    expect(report.status).toBe("FRESH");
  });

  test("docs API becomes stale when schema projection changes", () => {
    const report = evaluateDerivedArtifactFreshness(
      {
        artifact_kind: "DOCS_API",
        revisions: {
          ...expected,
          schema_projection: "e".repeat(64),
          aggregate: "f".repeat(64),
        },
      },
      expected
    );
    expect(report.status).toBe("STALE");
    expect(report.stale_dimensions).toEqual(["schema_projection"]);
  });
});
