import { describe, expect, test } from "bun:test";
import {
  isSemanticHistoryEffect,
  semanticHistoryEffectSchema,
} from "@/lib/semanticHistory";

describe("shared semantic history effect contract", () => {
  test("accepts canonical bounded stale scopes", () => {
    const effect = {
      stale: ["GEOMETRY_STRUCTURE", "ANIMATION_MOTION"],
      workspace_projection: true,
      acceptance_gates: true,
    } as const;

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

  test("Control consumes the shared history-effect schema", async () => {
    const source = await Bun.file("gateway/control/delta/freshness.ts").text();
    expect(source).toContain(
      'from "../../../lib/semanticHistory"'
    );
    expect(source).toContain(
      "isSemanticHistoryEffect(candidate.semantic_effect)"
    );
  });
});
