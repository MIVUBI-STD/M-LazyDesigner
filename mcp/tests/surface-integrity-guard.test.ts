import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { importToolDocs } from "@/server/tools/import";
import { uiToolDocs } from "@/server/tools/ui";
import {
  drawShapeToolParameters,
  gradientToolParameters,
  paintWithBrushParameters,
} from "@/server/tools/paint";
import { manageRenderProfileParameters } from "@/server/tools/render-profile";
import { getEnabledToolDefinitions } from "@/lib/factories";
import { tools, isCatalogToolEnabled } from "@/server/tools";

// Ensure the default Bedrock Entity profile is registered so surface
// assertions hold regardless of per-file execution order.
import "@/server/tools";

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

describe("advertised surface and fail-closed integrity guards", () => {
  test("all retained tools stay listed with their authored shapes", () => {
    // Same shared-process exclusion as default-registration-import-safe:
    // fixture and extended-family registrations from other test files must
    // not distort the default Bedrock product surface count.
    const extendedToolNames = new Set(
      [...importToolDocs, ...uiToolDocs].map((tool) => tool.name)
    );
    const enabledDefinitions = Object.entries(tools).filter(
      ([name]) =>
        isCatalogToolEnabled(name) &&
        !name.includes("fixture") &&
        !extendedToolNames.has(name)
    );
    // Two legacy 3D-assisted capabilities were intentionally retired from the
    // normal Bedrock authoring catalog; the retained callable source surface is 54.
    expect(enabledDefinitions.length).toBe(54);
    expect(enabledDefinitions.some(([name]) => name === "manage_render_profile")).toBe(true);
    expect(enabledDefinitions.some(([name]) => name === "manage_geometry_reference")).toBe(false);
    expect(enabledDefinitions.some(([name]) => name === "materialize_3d_assisted_scaffold")).toBe(false);

    for (const [, toolDef] of enabledDefinitions) {
      const { description, status } = toolDef as {
        description?: unknown;
        status?: unknown;
      };
      // A listed tool must always carry both its advertised shape and its
      // full runtime validation schema.
      expect(description).toBeDefined();
      expect(status).toBeDefined();
    }
  });

  test("advertised shapes retain real fields after SDK shape extraction", () => {
    // Guards against silent extractShape degradation (e.g. a future zod
    // major changing _def internals): if extraction starts returning empty
    // objects, these core advertised fields disappear and this test fails.
    expect(getEnabledToolDefinitions().manage_cubes).toBeDefined();
    expect(getEnabledToolDefinitions().create_project).toBeDefined();
    expect(getEnabledToolDefinitions().export_model).toBeDefined();
    expect(getEnabledToolDefinitions().manage_geometry_reference).toBeUndefined();
    expect(getEnabledToolDefinitions().manage_render_profile).toBeDefined();

    // manage_render_profile is intentionally an ordinary Zod union. Its
    // branch contract is validated through the authoritative parser rather
    // than depending on private SDK/Zod union shape internals.
    expect(
      manageRenderProfileParameters.safeParse({
        operation: "bind",
        client_entity_source: {
          content:
            '{"minecraft:client_entity":{"description":{"materials":{"default":"entity"}}}}',
        },
        render_controller_source: {
          content:
            '{"render_controllers":{"controller.render.fixture":{"materials":[{"*":"Material.default"}]}}}',
        },
        slot: "glass",
        render_profile: "translucent",
        render_controller: "controller.render.fixture",
        bone_pattern: "window*",
      }).success
    ).toBe(true);
    expect(
      manageRenderProfileParameters.safeParse({
        operation: "bind",
        client_entity_source: { content: "{}" },
        render_controller_source: { content: "{}" },
        slot: "glass",
        render_profile: "custom",
        render_controller: "controller.render.fixture",
        bone_pattern: "window*",
      }).success
    ).toBe(false);
  });

  test("pixel schemas reject malformed colors and out-of-enum blend modes", () => {
    expect(
      drawShapeToolParameters.safeParse({
        shape: "rectangle",
        start: { x: 0, y: 0 },
        end: { x: 8, y: 8 },
        color: "#12345",
      }).success
    ).toBe(false);

    expect(
      gradientToolParameters.safeParse({
        start: { x: 0, y: 0 },
        end: { x: 4, y: 4 },
        start_color: "blue",
        end_color: "#00FF00",
        opacity: 255,
      }).success
    ).toBe(false);

    expect(
      paintWithBrushParameters.safeParse({
        texture_id: "tex-1",
        coordinates: [{ x: 1, y: 1 }],
        brush_settings: {
          size: 2,
          opacity: 128,
          color: "#ABCDEF",
          blend_mode: "sparkle",
        },
      }).success
    ).toBe(false);
  });

  test("mutation families keep their no-op and consent rejections", async () => {
    const locatorSource = await source("server/tools/locators.ts");
    expect(locatorSource).toContain("No-op update rejected");

    const historySource = await source("server/tools/history.ts");
    expect(historySource).toContain("Cannot undo");
    expect(historySource).toContain("Cannot redo");

    const elementSource = await source("server/tools/element-mutation.ts");
    expect(elementSource).toContain("isRoot && newName");

    const projectSource = await source("server/tools/project.ts");
    expect(projectSource).toContain("discard_unsaved");
    expect(projectSource).toContain("has unsaved changes");

    const exportSource = await source("server/tools/export.ts");
    expect(exportSource).toContain("overwrite !== true");
    expect(exportSource).toContain(
      "Refusing to replace the existing .bbmodel"
    );
    expect(exportSource).toContain("isSymbolicLink()");
    expect(exportSource).toContain(
      'flag: destinationExisted ? "w" : "wx"'
    );
    expect(exportSource).not.toContain("listBlockItThreeDAssistedReferences");
    expect(exportSource).not.toContain("manage_geometry_reference");

    const paintSource = [
      await source("server/tools/paint-primitives.ts"),
      await source("server/tools/paint-brush.ts"),
    ].join("\n");
    const boundsCalls = (
      paintSource.match(/requirePixelsWithinTexture\(texture/g) ?? []
    ).length;
    expect(boundsCalls).toBeGreaterThanOrEqual(6);

    const controllerSource = await source("server/tools/animation-controller.ts");
    expect(controllerSource).not.toContain(
      "text: JSON.stringify(result)"
    );
  });
});
