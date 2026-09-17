import { describe, expect, test } from "bun:test";
import {
  DEFAULT_MCP_REGISTRATION_PROFILE,
} from "@/lib/registrationProfile";
import {
  describeMcpSurfaceToolNames,
  getToolRegistrationFamily,
} from "@/server/tools";
import { manageRenderProfileParameters, renderProfileToolDocs } from "@/server/tools/render-profile";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("render profile authoring surface", () => {
  test("one explicit render-profile boundary belongs to Texture AUTHORING, not Animation", () => {
    expect(renderProfileToolDocs.name).toBe("manage_render_profile");
    expect(getToolRegistrationFamily("manage_render_profile")).toBe("textures");
    expect(describeMcpSurfaceToolNames(DEFAULT_MCP_REGISTRATION_PROFILE, "texturing")).toContain("manage_render_profile");
    expect(describeMcpSurfaceToolNames(DEFAULT_MCP_REGISTRATION_PROFILE, "geometry")).toContain("manage_render_profile");
    expect(describeMcpSurfaceToolNames(DEFAULT_MCP_REGISTRATION_PROFILE, "animation")).not.toContain("manage_render_profile");
  });

  test("render-profile schema keeps PBR and geometry-instance concepts out of the mutation contract", () => {
    expect(manageRenderProfileParameters.safeParse({
      operation: "bind",
      client_entity_source: { content: "{}" },
      render_controller_source: { content: "{}" },
      slot: "glass",
      render_profile: "translucent",
      render_controller: "controller.render.fixture",
      bone_pattern: "window*",
    }).success).toBe(true);

    const sourceText = renderProfileToolDocs.description;
    expect(sourceText).toContain("client_entity");
    expect(sourceText).toContain("render-controller");
    expect(sourceText).toContain("separate from PBR manage_material");
  });

  test("texturing guidance routes runtime render behavior without renaming the PBR facade", async () => {
    const [skill, renderStandard, surfaceStandard] = await Promise.all([
      source("../.agents/skills/lazydesigner-texturing/SKILL.md"),
      source("../docs/03-authoring/texture/render-profile.md"),
      source("../docs/03-authoring/texture/surface-pattern.md"),
    ]);

    expect(renderStandard).toContain("manage_render_profile");
    expect(renderStandard).toContain("ordered");
    expect(surfaceStandard).toContain("planTextureTreatment");
    expect(surfaceStandard).toContain("render_profile_inference = forbidden");
    expect(skill).toContain("manage_material");
    expect(skill).toContain("manage_material_instances");
  });
});
