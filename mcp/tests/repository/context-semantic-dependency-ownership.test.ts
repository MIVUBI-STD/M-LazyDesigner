import { describe, expect, test } from "bun:test";

describe("context semantic dependency ownership", () => {
  test("context loader delegates semantic dependency policy", async () => {
    const source = await Bun.file("gateway/control/contexts.ts").text();
    expect(source).toContain("semanticDependenciesForOwner");
    expect(source).toContain("semanticOwnerForPath");
    expect(source).not.toContain("CAPABILITY_SEMANTIC_CATALOG_REVISIONS");
    expect(source).not.toContain("semanticFingerprint");
  });

  test("packet cache reuses the central semantic revision helper", async () => {
    const source = await Bun.file("gateway/control/packetContext.ts").text();
    expect(source).toContain("semanticRevisionForDependencies");
    expect(source).not.toContain("CAPABILITY_SEMANTIC_CATALOG_REVISIONS");
    expect(source).not.toContain("semanticFingerprint");
  });
});
