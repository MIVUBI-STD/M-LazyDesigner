import { describe, expect, test } from "bun:test";

describe("texture module ownership", () => {
  test("material and assignment implementations stay outside the core texture owner", async () => {
    const [core, assignment, materials] = await Promise.all([
      Bun.file("server/tools/texture.ts").text(),
      Bun.file("server/tools/texture-assignment.ts").text(),
      Bun.file("server/tools/texture-materials.ts").text(),
    ]);

    expect(core).toContain('from "./texture-assignment"');
    expect(core).toContain('from "./texture-materials"');
    expect(core).toContain("registerTextureAssignmentTools();");
    expect(core).toContain("registerTextureMaterialTools();");
    expect(core).toContain("registerTextureActivationTool();");

    expect(assignment).toContain("export function registerTextureAssignmentTools");
    expect(assignment).toContain("export function registerTextureActivationTool");
    expect(materials).toContain("export function registerTextureMaterialTools");
    expect(materials).toContain("export const createPbrMaterialParameters");
  });

  test("registration order preserves the original texture capability sequence", async () => {
    const core = await Bun.file("server/tools/texture.ts").text();
    const order = [
      "createTool(textureToolDocs[0].name",
      "registerTextureAssignmentTools();",
      "createTool(textureToolDocs[3].name",
      "createTool(textureToolDocs[4].name",
      "registerTextureMaterialTools();",
      "registerTextureActivationTool();",
    ].map((marker) => core.indexOf(marker));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});
