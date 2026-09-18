import { describe, expect, test } from "bun:test";
import { buildControlDelta } from "@/gateway/control";

describe("Control Texture mutation precision", () => {
  test("authored Texture mutations invalidate only Texture knowledge", () => {
    for (const capability of [
      "paint_with_brush",
      "gradient_tool",
      "copy_brush_tool",
      "texture_layer_management",
      "add_texture_group",
      "import_texture_set",
      "manage_material",
    ] as const) {
      const delta = buildControlDelta({
        capability,
        phaseBefore: null,
        phaseAfter: null,
        projectUuid: "project-a",
        succeeded: true,
      });

      expect(delta.authoring_domain, capability).toBe("TEXTURING");
      expect(delta.invalidates.authoring_domains, capability).toEqual(["TEXTURING"]);
      expect(delta.invalidates.workspace_projection, capability).toBe(true);
      expect(delta.invalidates.acceptance_gates, capability).toBe(true);
    }
  });

  test("texture changes preserve independent Texture evidence by scope", () => {
    const paint = buildControlDelta({
      capability: "paint_with_brush",
      phaseBefore: null,
      phaseAfter: null,
      projectUuid: "project-a",
      succeeded: true,
    });
    expect(paint.freshness.stale).toEqual(["TEXTURE_APPEARANCE"]);
    expect(paint.freshness.fresh).toContain("MATERIAL_RENDER");

    const material = buildControlDelta({
      capability: "manage_material",
      phaseBefore: null,
      phaseAfter: null,
      projectUuid: "project-a",
      succeeded: true,
    });
    expect(material.freshness.stale).toEqual(["MATERIAL_RENDER"]);
    expect(material.freshness.fresh).toContain("TEXTURE_APPEARANCE");

    const textureSet = buildControlDelta({
      capability: "import_texture_set",
      phaseBefore: null,
      phaseAfter: null,
      projectUuid: "project-a",
      succeeded: true,
    });
    expect(textureSet.freshness.stale).toEqual([
      "TEXTURE_APPEARANCE",
      "MATERIAL_RENDER",
    ]);
  });

  test("texture focus changes do not invalidate authored Texture evidence", () => {
    const delta = buildControlDelta({
      capability: "activate_texture",
      phaseBefore: null,
      phaseAfter: null,
      projectUuid: "project-a",
      succeeded: true,
    });

    expect(delta.authoring_domain).toBe("TEXTURING");
    expect(delta.invalidates.authoring_domains).toEqual([]);
    expect(delta.invalidates.workspace_projection).toBe(false);
    expect(delta.invalidates.acceptance_gates).toBe(false);
    expect(delta.freshness.basis).toBe("NO_CHANGE");
    expect(delta.freshness.stale).toEqual([]);
    expect(delta.freshness.fresh).toHaveLength(8);
    expect(delta.freshness.unknown).toEqual([]);
  });
});
