import { describe, expect, test } from "bun:test";
import {
  ASSET_DEPENDENCY_GRAPH,
  assetDependencyForScope,
  assetDomainsForScopes,
} from "@/lib/assetDependencyGraph";
import { CAPABILITY_SEMANTIC_SCOPES } from "@/lib/capabilities/manifest";

describe("canonical asset dependency graph", () => {
  test("owns every semantic freshness scope exactly once", () => {
    expect(Object.keys(ASSET_DEPENDENCY_GRAPH).sort()).toEqual(
      [...CAPABILITY_SEMANTIC_SCOPES].sort()
    );
  });

  test("projects stable domain ownership and minimum recheck semantics", () => {
    expect(assetDependencyForScope("GEOMETRY_STRUCTURE")).toMatchObject({
      domain: "GEOMETRY",
      recheck: "REVERIFY_GEOMETRY",
    });
    expect(assetDependencyForScope("UV_MAPPING")).toMatchObject({
      domain: "TEXTURING",
      recheck: "REVERIFY_UV_LAYOUT",
    });
    expect(assetDependencyForScope("ANIMATION_MOTION")).toMatchObject({
      domain: "ANIMATION",
      recheck: "REVERIFY_ANIMATION_MOTION",
    });
  });

  test("deduplicates affected domains without widening them", () => {
    expect(
      assetDomainsForScopes(["UV_MAPPING", "TEXTURE_APPEARANCE"])
    ).toEqual(["TEXTURING"]);
    expect(
      assetDomainsForScopes(["GEOMETRY_STRUCTURE", "ANIMATION_MOTION"])
    ).toEqual(["GEOMETRY", "ANIMATION"]);
  });
});
