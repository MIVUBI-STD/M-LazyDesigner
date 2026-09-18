import { describe, expect, test } from "bun:test";
import { inspectAnimationParameters } from "@/server/tools/animation-inspection";
import { captureScreenshotParameters } from "@/server/tools/camera";
import { elementInspectionToolDocs, inspectElementParameters } from "@/server/tools/element-inspection";
import {
  filterByMaterialParameters,
  findElementsByCriteriaParameters,
  listOutlineParameters,
} from "@/server/tools/element";
import {
  facesArrayOptionalSchema,
  facesArrayWithDefaultSchema,
  listMaterialInstancesParametersSchema,
  materialInstanceAssignmentSchema,
} from "@/server/tools/material-instances";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("context and payload cleanup", () => {
  test("canonical workflow stays compact while preserving current hard validity invariants", async () => {
    const workflow = await source("prompts/bedrock_entity_workflow.md");
    // Character ceilings are owned by authoring/static-footprint-budget.test.ts.
    for (const invariant of [
      "Minimum Necessary Evidence",
      "FAIL",
      "UNVERIFIED",
      "PASS",
      "BLOCKED",
      "Same causal correction failing twice without new evidence",
      "geometry_effect",
      "Front PASS is not full 3D PASS",
      "UV Layout",
      "Texture Atlas",
      "Texture Styling",
      "Texture Verify",
    ]) expect(workflow).toContain(invariant);
    expect(workflow).not.toContain("Reference Evidence Map");
    expect(workflow).not.toContain("Texture Design Contract");
  });

  test("panel metadata uses actual tool descriptions", async () => {
    const factories = await source("lib/factories.ts");
    expect(factories).toContain("description: toolDef.description");
    expect(factories).not.toContain("description: toolDef.title,");
  });

  test("Texture resource stays metadata-only and routes image reads to get_texture", async () => {
    const resources = await source("server/resources.ts");
    expect(resources).toContain("has_source: Boolean(texture.source)");
    expect(resources).not.toContain("source: texture.source || null");
    expect(resources).toContain("use `get_texture` when image data is actually needed");
  });

  test("validator status is summary-only with lazy detail resources", async () => {
    const validator = await source("server/resources/validator.ts");
    const start = validator.indexOf('createResource("validator-status"');
    const end = validator.indexOf('createResource("validator-checks"', start);
    const statusSection = validator.slice(start, end);
    expect(statusSection).toContain("detail_resources");
    expect(statusSection).toContain('errors: "validator://errors"');
    expect(statusSection).not.toContain("const errors = Validator.errors.map");
    expect(statusSection).not.toContain("const warnings = Validator.warnings.map");
  });

  test("animation summary keeps particle-effect keyframes lazy by default", async () => {
    expect(inspectAnimationParameters.parse({}).include_effect_keyframes).toBe(false);
    expect(inspectAnimationParameters.parse({ include_effect_keyframes: true }).include_effect_keyframes).toBe(true);
    const inspection = await source("server/tools/animation-inspection.ts");
    expect(inspection).toContain("inspectParticleEffects(animation, include_effect_keyframes)");
    expect(inspection).toContain("sound_count");
    expect(inspection).toContain("existingEffects.sound");
  });

  test("list_outline defaults are compact while larger explicit bounds remain available", async () => {
    const parsed = listOutlineParameters.parse({});
    expect(parsed.max_depth).toBe(8);
    expect(parsed.max_nodes).toBe(120);
    expect(listOutlineParameters.parse({ max_depth: 32, max_nodes: 5000 })).toEqual({
      include_cubes: true, max_depth: 32, max_nodes: 5000,
    });
    expect(listOutlineParameters.safeParse({ max_nodes: 5001 }).success).toBe(false);

    const elements = await source("server/tools/element-discovery.ts");
    const start = elements.indexOf("createTool(elementDiscoveryToolDocs[0].name");
    const end = elements.indexOf("createTool(elementDiscoveryToolDocs[1].name", start);
    const outline = elements.slice(start, end);
    expect(outline).toContain("let returnedNodes = 0");
    expect(outline).toContain("returnedNodes >= max_nodes");
    expect(outline).toContain("returned_nodes: returnedNodes");
  });

  test("texture creation and material reads avoid redundant image/JSON payloads", async () => {
    const texture = await source("server/tools/texture-create.ts");
    const createBlock = texture;
    expect(createBlock).not.toContain("texture.getDataURL()");
    expect(createBlock).toContain("structuredContent: result");
    expect(createBlock).toContain("uuid: texture.uuid");
    expect(createBlock).toContain("Use get_texture only when image evidence is needed");
  });

  test("element discovery defaults are compact and truncation remains explicit", async () => {
    expect(findElementsByCriteriaParameters.parse({}).limit).toBe(50);
    expect(findElementsByCriteriaParameters.parse({ limit: 1000 }).limit).toBe(1000);
    expect(filterByMaterialParameters.parse({ texture: "tex" }).limit).toBe(50);
    expect(filterByMaterialParameters.safeParse({ texture: "tex", limit: 1001 }).success).toBe(false);
  });

  test("material-instance discovery is summary-first and mutations reject empty face sets", async () => {
    expect(facesArrayWithDefaultSchema.safeParse([]).success).toBe(false);
    expect(facesArrayOptionalSchema.safeParse([]).success).toBe(false);
    expect(materialInstanceAssignmentSchema.safeParse({ cube_id: "cube-uuid", faces: [], material_name: "detail" }).success).toBe(false);
    const parsed = listMaterialInstancesParametersSchema.parse({});
    expect(parsed.include_usages).toBe(false);
    expect(parsed.usage_limit_per_instance).toBe(100);
  });

  test("high-frequency inspect_element routing prose stays compact", () => {
    const description = elementInspectionToolDocs[0].description;
    expect(description.length).toBeLessThan(350);
    expect(description).toContain("focused authored state");
    expect(description).toContain("compact geometry/hierarchy");
    expect(inspectElementParameters.shape.id.description).toContain("prefer UUID after discovery");
    expect(elementInspectionToolDocs[0].annotations?.readOnlyHint).toBe(true);
  });

  test("capture_screenshot is current-view only and does not select projects", async () => {
    expect(captureScreenshotParameters.parse({})).toEqual({});
    const camera = await source("server/tools/camera.ts");
    const util = await source("lib/util.ts");
    const start = camera.indexOf("createTool(cameraToolDocs[0].name");
    const end = camera.indexOf("createTool(cameraToolDocs[1].name", start);
    const block = camera.slice(start, end);
    expect(block).toContain("async execute()");
    expect(block).toContain("captureScreenshot()");
    expect(block).not.toContain("project");
    expect(util).not.toContain("ModelProject.all.find");
  });

  test("selection-only helper is not advertised as destructive model mutation", async () => {
    const elements = await source("server/tools/element.ts");
    const start = elements.indexOf('name: "select_all_of_type"');
    const end = elements.indexOf('name: "filter_by_material"', start);
    const block = elements.slice(start, end);
    expect(block).toContain("destructiveHint: false");
    expect(block).not.toContain("destructiveHint: true");
  });
});
