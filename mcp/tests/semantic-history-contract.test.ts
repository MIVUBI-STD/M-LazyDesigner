import { describe, expect, test } from "bun:test";
import {
  isSemanticHistoryEffect,
  semanticHistoryEffectSchema,
  type SemanticHistoryEffect,
} from "@/lib/authoring/semanticHistory";
import { buildControlDelta } from "@/gateway/control";

describe("shared semantic history effect contract", () => {
  test("accepts canonical bounded stale scopes", () => {
    const effect: SemanticHistoryEffect = {
      stale: ["GEOMETRY_STRUCTURE", "ANIMATION_MOTION"],
      workspace_projection: true,
      acceptance_gates: true,
    };

    expect(isSemanticHistoryEffect(effect)).toBe(true);
    expect(semanticHistoryEffectSchema.parse(effect)).toEqual(effect);
  });

  test("accepts known metadata-only history effects", () => {
    expect(
      isSemanticHistoryEffect({
        stale: [],
        workspace_projection: true,
        acceptance_gates: false,
      })
    ).toBe(true);
  });

  test("rejects unknown scopes and incomplete receipt shapes", () => {
    expect(
      isSemanticHistoryEffect({
        stale: ["FUTURE_UNKNOWN_SCOPE"],
        workspace_projection: true,
        acceptance_gates: true,
      })
    ).toBe(false);

    expect(
      isSemanticHistoryEffect({
        stale: ["MATERIAL_RENDER"],
        workspace_projection: true,
      })
    ).toBe(false);
  });

  test("Control invalidation uses the canonical history receipt rather than filename text", () => {
    const receipt: SemanticHistoryEffect = {
      stale: ["GEOMETRY_STRUCTURE", "ANIMATION_MOTION"],
      workspace_projection: true,
      acceptance_gates: true,
    };
    const completed = buildControlDelta({
      capability: "undo",
      phaseBefore: null, phaseAfter: null,
      projectUuid: "project-a",
      succeeded: true,
      result: { semantic_effect: receipt },
    });
    expect(completed.freshness.basis).toBe("PRECISE_EFFECT");
    expect(completed.freshness.stale).toEqual(receipt.stale);
    expect(completed.invalidates.authoring_domains).toEqual(["GEOMETRY", "ANIMATION"]);

    const malformed = buildControlDelta({
      capability: "undo",
      phaseBefore: null, phaseAfter: null,
      projectUuid: "project-a",
      succeeded: true,
      result: {
        semantic_effect: {
          ...receipt,
          stale: ["FUTURE_UNKNOWN_SCOPE"],
        },
      },
    });
    expect(malformed.freshness.basis).toBe("CONSERVATIVE_EFFECT");
    expect(malformed.freshness.stale).toContain("TEXTURE_APPEARANCE");
    expect(malformed.invalidates.authoring_domains).toContain("TEXTURING");
  });
});
