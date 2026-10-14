import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("texture render and material quality closure", () => {
  test("specialist closes technical alignment after face coverage without adding visual-score proxies", async () => {
    const [skill, standard] = await Promise.all([
      Promise.all([source("../.agents/skills/lazydesigner-texturing/SKILL.md"), source("../.agents/skills/lazydesigner-texturing/references/fidelity-styling-verification.md")]).then((parts) => parts.join("\n")),
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
    const [alignment, runtime, bootstrap, material, validation] = await Promise.all([
      source("lib/texture/productionAlignment.ts"),
      source("server/runtime/extensions/texture/quality.ts"),
      source("server/runtime/extensions.ts"),
      source("server/tools/texture/materials.ts"),
      source("server/tools/texture/materialValidation.ts"),
    ]);
    expect(alignment).toContain("metadata_only: true");
    expect(alignment).toContain("extra_pixel_scan: false");
    expect(alignment).toContain("PBR_MATERIAL_CHANNEL_CONFLICT");
    expect(runtime).toContain('runtimeDefinition("list_textures")');
    expect(runtime).not.toContain('runtimeDefinition("manage_material")');
    expect(material).toContain('createTool(');
    expect(material).toContain("planPbrMaterialConfiguration");
    expect(validation).toContain('color_texture="none"');
    expect(bootstrap).toContain("apply: wireTextureQualityRuntime");
  });
  test("format-sensitive render profiles stay explicit in the texturing hot path", async () => {
    const [skill, renderProfile] = await Promise.all([
      Promise.all([source("../.agents/skills/lazydesigner-texturing/SKILL.md"), source("../.agents/skills/lazydesigner-texturing/references/fidelity-styling-verification.md")]).then((parts) => parts.join("\n")),
      source("../docs/03-authoring/texture/render-profile.md"),
    ]);

    expect(skill).toContain("Render-Format Guard");
    expect(skill).toContain("entity_emissive");
    expect(skill).toContain("TGA");
    expect(skill).toContain("entity_emissive_layer");
    expect(skill).toContain("layered-PNG");
    expect(renderProfile).toContain("requires a TGA texture");
    expect(renderProfile).toContain("two-layer PNG workflow");
    expect(renderProfile).toContain("Blockbench preview boundary");
  });

});
