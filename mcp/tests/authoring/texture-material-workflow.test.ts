import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("texture material workflow and diagnostics", () => {
  test("texturing guidance keeps the established material facade and bounded diagnostics", async () => {
    const skill = await source("../.agents/skills/lazydesigner-texturing/SKILL.md");

    expect(skill).toContain("PBR/material semantics → manage_material / manage_material_instances");
    expect(skill).toContain("list_materials");
    expect(skill).toContain("get_material_info");
    expect(skill).toContain("normal XOR height");
    expect(skill).toContain("MERS");
    expect(skill).toContain("authoring_status");
    expect(skill).toContain("seam_continuity");
    expect(skill).toContain("pbr_content");
  });

  test("canonical texture standards separate render, PBR, geometry-instance, and surface-pattern namespaces", async () => {
    const [pbr, render, pattern, skill] = await Promise.all([
      source("../docs/03-authoring/texture/material.md"),
      source("../docs/03-authoring/texture/render-profile.md"),
      source("../docs/03-authoring/texture/surface-pattern.md"),
      source("../.agents/skills/lazydesigner-texturing/SKILL.md"),
    ]);

    expect(pbr).toContain("MER texture + subsurface_value>0");
    expect(pbr).toContain("save.path_ready");
    expect(pbr).toContain("normal XOR height");
    expect(pbr).toContain("manage_material");
    expect(pbr).toContain("pbr_texture_set");

    for (const marker of [
      "render_profile",
      "minecraft_material_code",
      "pbr_texture_set",
      "geometry_material_instance",
      "surface_pattern",
    ]) {
      expect(render).toContain(marker);
      expect(skill).toContain(marker);
    }
    expect(render).toContain("entity_alphatest");
    expect(render).toContain("entity_alphablend");
    expect(render).toContain("entity_emissive");
    expect(render).toContain("render_mode");
    expect(pattern).toContain("wood_grain");
    expect(pattern).toContain("brushed_metal");
    expect(pattern).toContain("cloth_weave");
  });

  test("runtime augments existing texture/material tools instead of adding another MCP surface", async () => {
    const [runtime, bootstrap] = await Promise.all([
      source("server/tools/texture-authoring-runtime.ts"),
      source("server/runtime/extensions.ts"),
    ]);

    for (const tool of [
      "list_textures",
      "list_materials",
      "get_material_info",
      "manage_material",
    ]) {
      expect(runtime).toContain(`runtimeDefinition(\"${tool}\")`);
    }
    expect(runtime).not.toContain("createTool(");
    expect(bootstrap).toContain("apply: wireTextureAuthoringRuntime");
  });
});
