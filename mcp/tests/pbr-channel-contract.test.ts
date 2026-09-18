import { describe, expect, test } from "bun:test";
import {
  configureMaterialParameters,
  createPbrMaterialParameters,
  hasExactTextureGroupNameCollision,
  requireDistinctPbrChannelAssignments,
  importedTextureGroupName,
  isMinecraftTextureSetDocument,
  requireMaterialConfigSavePostcondition,
} from "@/server/tools/texture";

describe("PBR channel identity preflight", () => {
  test("texture_set import preflight rejects non-texture-set documents and derives native group identity", async () => {
    expect(isMinecraftTextureSetDocument({ "minecraft:texture_set": { color: "skin" } })).toBe(true);
    expect(isMinecraftTextureSetDocument({ format_version: "1.16.100" })).toBe(false);
    expect(isMinecraftTextureSetDocument({ "minecraft:texture_set": null })).toBe(false);
    expect(importedTextureGroupName("/packs/skin.texture_set.json")).toBe("skin.png material");
    expect(importedTextureGroupName("C:\\packs\\skin.texture_set.json")).toBe("skin.png material");

    const source = await Bun.file(new URL("../server/tools/texture-materials.ts", import.meta.url)).text();
    const block = source;
    expect(block).toContain("isMinecraftTextureSetDocument(document)");
    expect(block).toContain("hasExactTextureGroupNameCollision(TextureGroup.all, expectedGroupName)");
    expect(block).toContain("createdGroups.length !== 1");
    expect(block.indexOf("isMinecraftTextureSetDocument(document)")).toBeLessThan(block.indexOf("importTextureSet({ path, name: fileName })"));
  });

  test("material config save requires a confirmed native/file postcondition", async () => {
    expect(() => requireMaterialConfigSavePostcondition(true, true, "/tmp/mat.texture_set.json")).not.toThrow();
    expect(() => requireMaterialConfigSavePostcondition(false, true, "/tmp/mat.texture_set.json")).toThrow("save was not confirmed");
    expect(() => requireMaterialConfigSavePostcondition(true, false, "/tmp/mat.texture_set.json")).toThrow("save was not confirmed");

    const source = await Bun.file(new URL("../server/tools/texture-materials.ts", import.meta.url)).text();
    const block = source;
    expect(block).toContain("textureGroup.material_config.save()");
    expect(block).toContain("fs.existsSync(filePath)");
    expect(block.indexOf("requireMaterialConfigSavePostcondition")).toBeLessThan(block.indexOf("return `Saved material config"));
  });

  test("TextureGroup creation rejects exact name collisions", async () => {
    expect(hasExactTextureGroupNameCollision([{ name: "body" }], "body")).toBe(true);
    expect(hasExactTextureGroupNameCollision([{ name: "body" }], "Body")).toBe(false);

    const [assignment, materials] = await Promise.all([
      Bun.file(new URL("../server/tools/texture-assignment.ts", import.meta.url)).text(),
      Bun.file(new URL("../server/tools/texture-materials.ts", import.meta.url)).text(),
    ]);
    const addBlock = assignment;
    expect(addBlock.indexOf("hasExactTextureGroupNameCollision")).toBeLessThan(addBlock.indexOf("Undo.initEdit"));

    const pbrBlock = materials;
    expect(pbrBlock.indexOf("hasExactTextureGroupNameCollision")).toBeLessThan(pbrBlock.indexOf("Undo.initEdit"));
  });

  test("new textures and texture groups publish native Undo post-state", async () => {
    const [source, assignment] = await Promise.all([
      Bun.file(new URL("../server/tools/texture.ts", import.meta.url)).text(),
      Bun.file(new URL("../server/tools/texture-assignment.ts", import.meta.url)).text(),
    ]);

    const textureStart = source.indexOf("createTool(textureToolDocs[0].name");
    const textureEnd = source.indexOf("registerTextureAssignmentTools();", textureStart);
    const textureBlock = source.slice(textureStart, textureEnd);
    expect(textureBlock).toContain("textures: [texture]");

    const groupBlock = assignment;
    expect(groupBlock).toContain("texture.group = textureGroup.uuid");
    expect(groupBlock).not.toContain("texture.extend(");
    expect(groupBlock).toContain("texture_groups: [textureGroup]");
    expect(groupBlock).toContain("textureGroup.remove()");
  });

  test("PBR material creation uses native channel assignment and atomic Undo ownership", async () => {
    const source = await Bun.file(new URL("../server/tools/texture-materials.ts", import.meta.url)).text();
    const block = source;

    expect(block).toContain('colorTexture.group = textureGroup.uuid');
    expect(block).toContain('colorTexture.pbr_channel = "color"');
    expect(block).not.toContain("colorTexture.extend(");
    expect(block).toContain("textureGroup.remove()");
    expect(block).toContain("texture_groups: [textureGroup]");

    const configureStart = source.indexOf("createTool(textureMaterialToolDocs[1].name");
    const configureEnd = source.indexOf("createTool(textureMaterialToolDocs[2].name", configureStart);
    const configureBlock = source.slice(configureStart, configureEnd);
    expect(configureBlock).toContain('normalTexture.group = textureGroup.uuid');
    expect(configureBlock).not.toContain("normalTexture.extend(");

    const assignStart = source.indexOf("createTool(textureMaterialToolDocs[5].name");
    const assignEnd = source.indexOf("createTool(textureMaterialToolDocs[6].name", assignStart);
    const assignBlock = source.slice(assignStart, assignEnd);
    expect(assignBlock).toContain("tex.group = textureGroup.uuid");
    expect(assignBlock).toContain("tex.pbr_channel = channel");
    expect(assignBlock).not.toContain("tex.extend(");
  });

  test("PBR source combinations match the effective native Bedrock compile branches", () => {
    expect(createPbrMaterialParameters.safeParse({ name: "mat", color_texture: "color", color_value: [255, 255, 255, 255] }).success).toBe(false);
    expect(createPbrMaterialParameters.safeParse({ name: "mat", mer_texture: "mer", mer_value: [1, 2, 3] }).success).toBe(false);
    expect(createPbrMaterialParameters.safeParse({ name: "mat", normal_texture: "normal", height_texture: "height" }).success).toBe(false);
    expect(createPbrMaterialParameters.safeParse({ name: "mat", color_value: [255, 255, 255, 255], height_texture: "height" }).success).toBe(true);

    expect(configureMaterialParameters.safeParse({ material: "mat", color_texture: "color", color_value: [255, 255, 255, 255] }).success).toBe(false);
    expect(configureMaterialParameters.safeParse({ material: "mat", color_texture: "none", color_value: [255, 255, 255, 255] }).success).toBe(true);
    expect(configureMaterialParameters.safeParse({ material: "mat", mer_texture: "mer", mer_value: [1, 2, 3] }).success).toBe(false);
    expect(configureMaterialParameters.safeParse({ material: "mat", mer_texture: "none", mer_value: [1, 2, 3] }).success).toBe(true);
    expect(configureMaterialParameters.safeParse({ material: "mat", normal_texture: "normal", height_texture: "height" }).success).toBe(false);
    expect(configureMaterialParameters.safeParse({ material: "mat", normal_texture: "normal", height_texture: "none" }).success).toBe(true);
  });
  test("accepts distinct Texture identities across channels", () => {
    expect(() =>
      requireDistinctPbrChannelAssignments([
        { channel: "color", texture: { uuid: "color-1", name: "Color" } },
        { channel: "normal", texture: { uuid: "normal-1", name: "Normal" } },
        { channel: "mer", texture: { uuid: "mer-1", name: "MER" } },
      ])
    ).not.toThrow();
  });

  test("rejects one Texture identity assigned to multiple channels", () => {
    expect(() =>
      requireDistinctPbrChannelAssignments([
        { channel: "color", texture: { uuid: "shared", name: "Shared" } },
        { channel: "normal", texture: { uuid: "shared", name: "Shared Alias" } },
      ])
    ).toThrow("cannot be assigned to both color and normal");
  });

  test("assign texture channel rejects an exact no-op before Undo", async () => {
    const source = await Bun.file(new URL("../server/tools/texture-materials.ts", import.meta.url)).text();
    const block = source;
    expect(block).toContain("tex.group === textureGroup.uuid");
    expect(block).toContain("tex.pbr_channel === channel");
    expect(block).toContain("resetTextures.length === 0");
    expect(block).toContain("no authored change is required");
    expect(block.indexOf("resetTextures.length === 0")).toBeLessThan(block.indexOf("Undo.initEdit"));
  });
  test("rejects configure calls with no authored change", () => {
    expect(configureMaterialParameters.safeParse({ material: "mat-1" }).success).toBe(false);
    expect(
      configureMaterialParameters.safeParse({ material: "mat-1", subsurface_value: 0 }).success
    ).toBe(true);
  });
});
