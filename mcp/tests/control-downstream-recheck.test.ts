import { describe, expect, test } from "bun:test";
import { downstreamRechecksForFreshness } from "@/gateway/control/delta/recheck";

describe("cross-domain regression recheck planning", () => {
  test("translation-only geometry keeps UV/texture/animation preserved", () => {
    const result = downstreamRechecksForFreshness({
      currentDomain: "GEOMETRY",
      stale: ["GEOMETRY_STRUCTURE"],
    });
    expect(result.required).toEqual([
      {
        scope: "GEOMETRY_STRUCTURE",
        domain: "GEOMETRY",
        action: "REVERIFY_GEOMETRY",
        reason: "Authored geometry structure changed.",
      },
    ]);
    expect(result.preserved_domains).toEqual([
      "TEXTURING",
      "ANIMATION",
    ]);
  });

  test("resize-style stale scopes request only affected downstream checks", () => {
    const result = downstreamRechecksForFreshness({
      currentDomain: "GEOMETRY",
      stale: [
        "GEOMETRY_STRUCTURE",
        "UV_MAPPING",
        "TEXTURE_APPEARANCE",
        "ANIMATION_MOTION",
      ],
    });
    expect(result.required.map((entry) => entry.action)).toEqual([
      "REVERIFY_ANIMATION_MOTION",
      "REVERIFY_GEOMETRY",
      "REVERIFY_MAPPED_TEXTURE",
      "REVERIFY_UV_LAYOUT",
    ]);
    expect(result.preserved_domains).toEqual([]);
  });

  test("pivot-only geometry does not invalidate UV or texture", () => {
    const result = downstreamRechecksForFreshness({
      currentDomain: "GEOMETRY",
      stale: ["GEOMETRY_STRUCTURE", "ANIMATION_MOTION"],
    });
    expect(result.required.map((entry) => entry.action)).toEqual([
      "REVERIFY_ANIMATION_MOTION",
      "REVERIFY_GEOMETRY",
    ]);
    expect(result.required.map((entry) => entry.action)).not.toContain(
      "REVERIFY_UV_LAYOUT"
    );
    expect(result.required.map((entry) => entry.action)).not.toContain(
      "REVERIFY_MAPPED_TEXTURE"
    );
    expect(result.preserved_domains).toEqual(["TEXTURING"]);
  });

  test("texture appearance mutation keeps animation preserved", () => {
    const result = downstreamRechecksForFreshness({
      currentDomain: "TEXTURING",
      stale: ["TEXTURE_APPEARANCE"],
    });
    expect(result.required).toHaveLength(1);
    expect(result.required[0]).toMatchObject({
      domain: "TEXTURING",
      action: "REVERIFY_MAPPED_TEXTURE",
    });
    expect(result.preserved_domains).toEqual([
      "GEOMETRY",
      "ANIMATION",
    ]);
  });
});
