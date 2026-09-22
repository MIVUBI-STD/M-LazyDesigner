import { describe, expect, test } from "bun:test";

describe("semantic policy deduplication", () => {
  test("freshness refresh routing delegates to dependency matrix policy", async () => {
    const source = await Bun.file("gateway/development/semanticFreshness.ts").text();
    expect(source).toContain("semanticRefreshSurfacesForDimensions");
    expect(source).not.toContain('refresh.add("CAPABILITY_SEARCH")');
    expect(source).not.toContain('refresh.add("DESCRIBE_SCHEMA")');
  });

  test("invalidation verification mapping delegates to dependency matrix policy", async () => {
    const source = await Bun.file("gateway/development/semanticInvalidation.ts").text();
    expect(source).toContain("semanticVerificationChecksForSurfaces");
    expect(source).not.toContain('checks.add("CAPABILITY_INTELLIGENCE")');
    expect(source).not.toContain('checks.add("DESCRIBE_PAYLOADS")');
  });
});
