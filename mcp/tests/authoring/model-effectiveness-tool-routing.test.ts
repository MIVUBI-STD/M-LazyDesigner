import { describe, expect, test } from "bun:test";
import { selectMcpPhaseWorkflowBody } from "@/server/prompts";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("model creation effectiveness — tool routing", () => {
  test("Geometry focus gets complete AUTHORING guidance without Animation tools", async () => {
    const [controlRegistry, modelling, workflow] = await Promise.all([
      source("gateway/control/registry.ts"),
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("prompts/bedrock_entity_workflow.md"),
    ]);
    const geometryRuntime = selectMcpPhaseWorkflowBody(workflow, "geometry");

    for (const tool of ["manage_cubes", "inspect_elements", "create_texture"]) {
      expect(geometryRuntime).toContain(tool);
    }
    expect(geometryRuntime).toContain("fresh model views");
    expect(geometryRuntime).not.toContain("create_animation");
    expect(controlRegistry).toContain("authoringDomainForCapability");
    expect(controlRegistry).toContain("sourceOwnerForCapability");
    expect(modelling).toContain("conditional surface integrity");
    expect(modelling).toContain("overlap alone never proves correctness");
    expect(modelling).toContain("Repeated/symmetric cohorts: derive once");
    expect(modelling).toContain("one coherent `manage_cubes` batch");
  });

  test("specialists reuse known state instead of forcing lifecycle/discovery rereads", async () => {
    const [animation, texturing] = await Promise.all([
      source("../.agents/skills/lazydesigner-animation/SKILL.md"),
      source("../.agents/skills/lazydesigner-texturing/SKILL.md"),
    ]);
    const normalizedAnimation = animation.toLowerCase().replaceAll("`", "");
    const normalizedTexturing = texturing.toLowerCase();

    expect(normalizedAnimation).toContain("reuse fresh uuid/state");
    expect(normalizedAnimation).toContain("must not fall back to broad hierarchy discovery or confirmation reads");
    expect(normalizedTexturing).toContain("reuse fresh state");
    expect(normalizedTexturing).toMatch(/no confirmation rereads/);
    expect(texturing).toContain("Pin atlas UUID and pass `texture_id` when multiple textures are loaded");
  });

  test("convenience tools retain branch-only roles and are not promoted by Control", async () => {
    const [camera, elements, history, contract] = await Promise.all([
      source("server/tools/camera.ts"),
      source("server/tools/element.ts"),
      source("server/tools/history.ts"),
      source("gateway/contract.ts"),
    ]);

    expect(camera).toContain("cameraToolDocs[1].status, false");
    expect(camera).toContain("cameraToolDocs[2].status, false");

    const duplicateStart = elements.indexOf('name: "duplicate_element"');
    const duplicateEnd = elements.indexOf('name: "rename_element"', duplicateStart);
    const duplicateDoc = elements.slice(duplicateStart, duplicateEnd);
    expect(duplicateStart).toBeGreaterThan(-1);
    expect(duplicateDoc).toContain("status: STATUS_EXPERIMENTAL");
    expect(contract).not.toMatch(/PRIMARY_CAPABILITIES[\s\S]*"duplicate_element"/);

    expect(history).toContain('name: "get_undo_stack"');
    expect(contract).not.toMatch(/PRIMARY_CAPABILITIES[\s\S]*"get_undo_stack"/);
  });

  test("routing hardening preserves the existing Bedrock registration profile", async () => {
    const profile = await source("lib/registrationProfile.ts");
    expect(profile).toContain('export type McpRegistrationProfile = "bedrock_entity" | "extended";');
    expect(profile).toContain('"animation"');
    expect(profile).toContain('"paint"');
    expect(profile).toContain('"material_instances"');
    expect(profile).toContain('"textures"');
    expect(profile).not.toContain("geometry_only");
    expect(profile).not.toContain("tool_lane_profile");
  });
});
