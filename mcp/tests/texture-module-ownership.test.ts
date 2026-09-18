import { describe, expect, test } from "bun:test";

describe("texture module ownership", () => {
  test("texture facade aggregates focused capability owners only", async () => {
    const [facade, create, read, atlas, assignment, materials] = await Promise.all([
      Bun.file("server/tools/texture.ts").text(),
      Bun.file("server/tools/texture-create.ts").text(),
      Bun.file("server/tools/texture-read.ts").text(),
      Bun.file("server/tools/texture-atlas.ts").text(),
      Bun.file("server/tools/texture-assignment.ts").text(),
      Bun.file("server/tools/texture-materials.ts").text(),
    ]);

    expect(facade).not.toContain("createTool(");
    expect(facade).not.toContain("Undo.initEdit");
    expect(facade).toContain("registerCreateTextureTool();");
    expect(facade).toContain("registerTextureAssignmentTools();");
    expect(facade).toContain("registerTextureReadTools();");
    expect(facade).toContain("registerTextureMaterialTools();");
    expect(facade).toContain("registerTextureActivationTool();");

    expect(create).toContain("export function registerCreateTextureTool");
    expect(read).toContain("export function registerTextureReadTools");
    expect(atlas).toContain("export function buildUvAtlasAudit");
    expect(assignment).toContain("export function registerTextureAssignmentTools");
    expect(assignment).toContain("export function registerTextureActivationTool");
    expect(materials).toContain("export function registerTextureMaterialTools");
  });

  test("registration order preserves the original texture capability sequence", async () => {
    const facade = await Bun.file("server/tools/texture.ts").text();
    const order = [
      "registerCreateTextureTool();",
      "registerTextureAssignmentTools();",
      "registerTextureReadTools();",
      "registerTextureMaterialTools();",
      "registerTextureActivationTool();",
    ].map((marker) => facade.indexOf(marker));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});
