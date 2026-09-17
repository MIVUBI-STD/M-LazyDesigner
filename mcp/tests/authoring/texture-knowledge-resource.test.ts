import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("on-demand texture authoring knowledge", () => {
  test("surface recipes and Vanilla principles are resources rather than hot-path tools", async () => {
    const [resource, index, skill] = await Promise.all([
      source("server/resources/texture-authoring-knowledge.ts"),
      source("server/index.ts"),
      source("../.agents/skills/lazydesigner-texturing/SKILL.md"),
    ]);

    expect(index).toContain('import "./resources/texture-authoring-knowledge"');
    expect(resource).toContain('uriTemplate: "texture-authoring://{topic}"');
    for (const topic of [
      "surface-patterns",
      "vanilla-principles",
      "render-profiles",
      "treatment-plan",
    ]) expect(resource).toContain(topic);
    expect(resource).toContain("TEXTURE_SURFACE_PATTERN_RECIPES");
    expect(resource).toContain("VANILLA_TEXTURE_KNOWLEDGE");
    expect(resource).not.toContain("createTool(");
    expect(skill).not.toContain("wood_grain painted_wood brushed_metal bare_metal");
  });

  test("knowledge remains reference grammar instead of copied image assets or network dependency", async () => {
    const vanilla = await source("lib/textureVanillaKnowledge.ts");
    expect(vanilla).toContain("runtime_network_required: false");
    expect(vanilla).toContain("copied_texture_assets_required: false");
    expect(vanilla).toContain("inferring render_profile from surface_pattern");
  });
});
