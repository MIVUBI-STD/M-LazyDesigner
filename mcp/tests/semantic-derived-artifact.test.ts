import { describe, expect, test } from "bun:test";
import {
  evaluateDerivedArtifactFreshness,
  semanticDerivedArtifactStamp,
} from "../gateway/development/semanticArtifact";
import { CAPABILITY_SEMANTIC_CATALOG_REVISIONS } from "../gateway/capabilities/semanticRegistry";

describe("semantic derived artifact stamps", () => {
  test("stamps derived artifacts from the canonical semantic catalog", () => {
    const stamp = semanticDerivedArtifactStamp("DOCS_API");
    expect(stamp.semantic_revision_schema).toBe(1);
    expect(stamp.artifact_kind).toBe("DOCS_API");
    expect(stamp.revisions).toEqual(CAPABILITY_SEMANTIC_CATALOG_REVISIONS);
  });

  test("canonical stamp evaluates as fresh", () => {
    const report = evaluateDerivedArtifactFreshness(
      semanticDerivedArtifactStamp("DESCRIBE_REPORT")
    );
    expect(report.status).toBe("FRESH");
    expect(report.stale_dimensions).toEqual([]);
  });

  test("old derived stamp identifies the exact stale semantic dimension", () => {
    const stamp = semanticDerivedArtifactStamp("AI_STAGE_CONTEXT");
    const report = evaluateDerivedArtifactFreshness({
      artifact_kind: "AI_STAGE_CONTEXT",
      revisions: {
        ...stamp.revisions,
        routing: "stale-routing-revision",
      },
    });
    expect(report.status).toBe("STALE");
    expect(report.stale_dimensions).toEqual(["routing"]);
  });

  test("unstamped artifacts never count as fresh", () => {
    expect(evaluateDerivedArtifactFreshness(null).status).toBe("MISSING");
  });
});
