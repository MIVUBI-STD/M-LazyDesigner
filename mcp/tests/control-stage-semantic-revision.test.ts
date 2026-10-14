import { describe, expect, test } from "bun:test";
import { emptyReference } from "../gateway/control/referenceParser";
import { buildControlStageContext } from "../gateway/control/contextProjection";
import { CAPABILITY_SEMANTIC_CATALOG_REVISIONS } from "../gateway/capabilities/semanticRegistry";

describe("control stage semantic revision", () => {
  test("AI stage context carries the canonical semantic revision", () => {
    const context = buildControlStageContext({
      domain: "GEOMETRY",
      currentUserDelta: null,
      reference: {
        ...emptyReference("REFERENCE_PATH_UNAVAILABLE"),
        version: 1,
        fingerprint: "ref",
        intent: "test",
        selected_profile: null,
        requirements: {},
        images: [],
        documents: {},
        readiness: {
          overall: "READY",
          geometry: "READY",
          texture: "READY",
          animation: "READY",
        },
        blocking_unknowns: [],
        non_blocking_unknowns: [],
      } as any,
      workspace: {
        available: false,
        source_path: null,
        blockers: [],
        fingerprint: "workspace",
        asset: null,
        current_stage: null,
        gates: {},
        next_step: null,
      } as any,
    });

    expect(context.semantic.artifact_kind).toBe("AI_STAGE_CONTEXT");
    expect(context.semantic.revisions).toEqual(
      CAPABILITY_SEMANTIC_CATALOG_REVISIONS
    );
  });
});
