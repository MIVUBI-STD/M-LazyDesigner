import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("texture render and material quality closure", () => {
  test("specialist closes technical alignment after face coverage without adding visual-score proxies", async () => {
    const [skill, standard] = await Promise.all([
      source("../.agents/skills/lazydesigner-texturing/SKILL.md"),
      source("../docs/03-authoring/texture/standard.md"),
    ]);
    for (const marker of [
      "Face Coverage Ledger",
      "production_alignment.gate=ready",
      "entity_alphatest",
      "entity_alphablend",
      "normal XOR height",
      "paint_texture_transaction",
      "pixel_perfect",
      "lock_alpha",
      "paint_side_restrict",
      "Mirror after semantic symmetry",
    ]) expect(skill).toContain(marker);

    expect(skill).toContain("Unknown → `search_capabilities(limit=4)`");
    expect(skill).toContain("No confirmation rereads");
    expect(skill).toContain("ready` ≠ visual PASS");
    expect(skill.toLowerCase()).not.toContain("texture quality score");
    for (const marker of [
      "entity_alphatest",
      "entity_alphablend",
      "Red=Metalness",
      "Green=Emissive",
      "Blue=Roughness",
      "production_alignment.gate",
    ]) expect(standard).toContain(marker);
  });

  test("texture alignment stays metadata-only and material corrections reuse existing MCP surfaces", async () => {
    const [alignment, runtime, bootstrap] = await Promise.all([
      source("lib/textureProductionAlignment.ts"),
      source("server/tools/texture-quality-runtime.ts"),
      source("server/runtime/extensions.ts"),
    ]);
    expect(alignment).toContain("metadata_only: true");
    expect(alignment).toContain("extra_pixel_scan: false");
    expect(alignment).toContain("PBR_MATERIAL_CHANNEL_CONFLICT");
    expect(runtime).toContain('runtimeDefinition("list_textures")');
    expect(runtime).toContain('runtimeDefinition("manage_material")');
    expect(runtime).toContain("planPbrMaterialConfiguration");
    expect(runtime).toContain('color_texture="none"');
    expect(bootstrap).toContain("apply: wireTextureQualityRuntime");
  });
});
