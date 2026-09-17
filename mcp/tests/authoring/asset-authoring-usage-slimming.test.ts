import { describe, expect, test } from "bun:test";
import { exportModelParameters } from "@/server/tools/export";
import { createTextureParameters, importTextureSetParameters } from "@/server/tools/texture";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("pre-local asset-authoring usage slimming", () => {
  test("asset authoring bypasses repository-development boot and routes through Control to one active specialist", async () => {
    const agents = await source("../AGENTS.md");
    expect(agents).toContain("### Asset Authoring");
    expect(agents).toMatch(/do not automatically load/i);
    expect(agents).toMatch(/asset authoring is not software \*\*Development\*\*/i);
    expect(agents).toMatch(/do not route it through `lazydesigner-development-brief`/i);
    expect(agents).toContain("LazyDesigner Control");
    expect(agents).toContain("exactly one active specialist");
    expect(agents).toContain(".agents/skills/lazydesigner-modelling/SKILL.md");
    expect(agents).toContain(".agents/skills/lazydesigner-texturing/SKILL.md");
    expect(agents).toContain(".agents/skills/lazydesigner-animation/SKILL.md");
    expect(agents).not.toContain(".agents/skills/blockit-bedrock-entity-mcp/SKILL.md");
  });

  test("normal authoring context stays compact while hard gates and specialist judgement remain present", async () => {
    const [control, modelling, texturing] = await Promise.all([
      source("gateway/control/packet.ts"),
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../.agents/skills/lazydesigner-texturing/SKILL.md"),
    ]);

    expect(texturing.length).toBeLessThan(16_000);
    expect(control).toContain("GEOMETRY_CONTEXT");
    expect(control).toContain("TEXTURE_CONTEXT");
    expect(control).toContain("ANIMATION_CONTEXT");
    expect(control).toContain("knownContextIds");
    expect(control).toContain("workspace");
    expect(control).toContain("reference");

    for (const required of [
      "Primary Mass / Proportion / Depth",
      "Surface Coverage / Negative Space",
      "Geometry Detail Budget",
      "User Geometry APPROVED is required",
      "Native UV Layout / Texel Integrity",
      "geometry_effect",
    ]) expect(modelling).toContain(required);
    expect(modelling.toLowerCase()).toContain("difference-first");

    for (const required of [
      "Geometry APPROVED + UV Layout PASS",
      "Reference-Grounded Palette",
      "Coherent Styling Window / Anti-Micro-Loop",
      "No evidence-per-micro-mutation loop",
      "Atlas-Island Discipline",
      "color_picker_tool",
      "BASE | SHADOW | HIGHLIGHT | ACCENT/IDENTITY",
    ]) expect(texturing).toContain(required);

    for (const required of ["SUPPORTED", "PROVISIONAL", "CONFLICTING", "UNAVAILABLE", "FAIL", "UNVERIFIED", "PASS", "BLOCKED"]) {
      expect(modelling).toContain(required);
    }
  });

  test("filesystem export omits large returned content by default but remains opt-in", () => {
    expect(exportModelParameters.parse({ path: "/tmp/model.json" }).max_content_length).toBeUndefined();
    expect(exportModelParameters.parse({}).max_content_length).toBeUndefined();
    expect(exportModelParameters.parse({ path: "/tmp/model.json", max_content_length: 500 }).max_content_length).toBe(500);
  });

  test("filesystem export preserves native target semantics and verifies writes", async () => {
    const exportSource = await source("server/tools/export.ts");
    for (const marker of [
      'destructiveHint: true',
      'codec_id === "bedrock" && exportFs.existsSync(path)',
      "exportFs.writeFileSync",
      "exportFs.statSync(path)",
      "codec.afterSave(path)",
      "currentExportProjectLifecycle()",
    ]) expect(exportSource).toContain(marker);
  });

  test("filesystem export path must be platform-absolute", () => {
    for (const path of ["/tmp/model.json", "C:\\Exports\\model.json", "D:/Exports/model.bbmodel", "\\\\server\\share\\model.json"]) {
      expect(exportModelParameters.safeParse({ path }).success).toBe(true);
    }
    for (const path of ["", "model.json", "exports/model.json", ".\\model.json", "C:model.json"]) {
      expect(exportModelParameters.safeParse({ path }).success).toBe(false);
    }
  });

  test("filesystem import paths are deterministic", () => {
    for (const path of ["/tmp/material.texture_set.json", "C:\\Exports\\material.texture_set.json", "D:/Exports/material.texture_set.json", "\\\\server\\share\\material.texture_set.json"]) {
      expect(importTextureSetParameters.safeParse({ path }).success).toBe(true);
    }
    for (const path of ["material.texture_set.json", "textures/material.texture_set.json", ".\\material.texture_set.json", "C:material.texture_set.json"]) {
      expect(importTextureSetParameters.safeParse({ path }).success).toBe(false);
    }
  });

  test("create_texture image file sources do not depend on Blockbench cwd", () => {
    for (const data of ["data:image/png;base64,AAAA", "/tmp/texture.png", "C:\\Textures\\skin.png", "D:/Textures/skin.png", "\\\\server\\share\\skin.png", "file:///tmp/texture.png", "file://C:/Textures/skin.png"]) {
      expect(createTextureParameters.safeParse({ name: "skin", data }).success).toBe(true);
    }
    for (const data of ["texture.png", "textures/skin.png", ".\\skin.png", "https://example.com/skin.png"]) {
      expect(createTextureParameters.safeParse({ name: "skin", data }).success).toBe(false);
    }
  });

  test("create_texture converts RGBA byte alpha to TinyColor alpha range", async () => {
    expect(createTextureParameters.safeParse({ name: "translucent", fill_color: [255, 0, 0, 128], layer_name: "base" }).success).toBe(true);
    const texture = await source("server/tools/texture.ts");
    expect(texture).toContain("a: Number(fill_color[3] ?? 255) / 255");
  });

  test("high-frequency reads stay compact and Control avoids redundant search/status chatter", async () => {
    const files = await Promise.all([
      source("server/tools/element-inspection.ts"),
      source("server/tools/project.ts"),
      source("server/tools/animation.ts"),
      source("server/tools/animation-inspection.ts"),
      source("server/tools/locators.ts"),
    ]);
    for (const text of files) expect(text).not.toContain("JSON.stringify(result, null, 2)");
    const locatorSource = files[4];
    expect(locatorSource).toContain("function mutationResult(");
    expect(locatorSource).toContain("structuredContent: summary");

    const gateway = await source("gateway/index.ts");
    const searchStart = gateway.indexOf("GATEWAY_TOOLS.searchCapabilities");
    const describeStart = gateway.indexOf("GATEWAY_TOOLS.describeCapability", searchStart);
    const invokeStart = gateway.indexOf("GATEWAY_TOOLS.invokeCapability", describeStart);
    expect(gateway.slice(searchStart, describeStart)).not.toContain("backend.getStatus()");
    expect(gateway.slice(describeStart, invokeStart)).not.toContain("backend.getStatus()");
  });

  test("Cube correction results avoid redundant state and identity copies", async () => {
    const cubes = await source("server/tools/cubes.ts");
    const singleStart = cubes.indexOf("const executeUpdateCube");
    const batchStart = cubes.indexOf("const executeBatchUpdateCubes", singleStart);
    const single = cubes.slice(singleStart, batchStart);
    const batch = cubes.slice(batchStart);
    expect(single).toContain("after,");
    expect(single).toContain("geometry_effect");
    expect(batch).toContain("before,");
    expect(batch).toContain("after,");
    expect(batch).toContain("geometry_effect");
  });

  test("legacy UI fallback compatibility never presents itself as a normal authoring profile", async () => {
    const [index, settings, profile] = await Promise.all([
      source("index.ts"),
      source("ui/settings.ts"),
      source("lib/registrationProfile.ts"),
    ]);

    expect(index).not.toContain('new Action("blockit_enable_extended"');
    expect(index).not.toContain('new Action("blockit_disable_extended"');
    expect(index).not.toContain("Extended MCP Profile");
    expect(settings).toContain('name: "Legacy Compatibility (Developer)"');
    expect(settings).toContain("Troubleshooting support for older or generic Blockbench workflows");
    expect(settings).toContain("value: false");
    expect(profile).toContain('export type McpRegistrationProfile = "bedrock_entity" | "extended";');
  });

  test("capability architecture keeps the existing registration profile", async () => {
    const profile = await source("lib/registrationProfile.ts");
    expect(profile).toContain('export type McpRegistrationProfile = "bedrock_entity" | "extended";');
    expect(profile).not.toContain("asset_authoring_profile");
  });
});
