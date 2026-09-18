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

  test("material save preserves semantic freshness while marking persistence state changed", () => {
    const delta = buildControlDelta({
      capability: "manage_material",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        operation: "save",
        scope: "material_persistence_only",
      },
    });

    expect(delta.invalidates.authoring_domains).toEqual([]);
    expect(delta.invalidates.workspace_projection).toBe(true);
    expect(delta.invalidates.acceptance_gates).toBe(false);
    expect(delta.freshness.basis).toBe("NO_CHANGE");
    expect(delta.freshness.stale).toEqual([]);
    expect(delta.freshness.fresh).toHaveLength(8);
    expect(delta.verification_class).toBe("receipt_only");
  });

  test("material-instance reads preserve authored freshness while writes stay scoped", () => {
    const list = buildControlDelta({
      capability: "manage_material_instances",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        total_unique_instances: 2,
        material_instances: [{ name: "metal" }, { name: "glass" }],
      },
    });
    expect(list.invalidates.authoring_domains).toEqual([]);
    expect(list.freshness.basis).toBe("NO_CHANGE");
    expect(list.freshness.fresh).toHaveLength(8);
    expect(list.verification_class).toBe("receipt_only");

    const get = buildControlDelta({
      capability: "manage_material_instances",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        cube: { uuid: "cube-a", name: "body" },
        faces: { north: { material_name: "metal", texture: null } },
      },
    });
    expect(get.invalidates.authoring_domains).toEqual([]);
    expect(get.freshness.basis).toBe("NO_CHANGE");
    expect(get.verification_class).toBe("receipt_only");

    const write = buildControlDelta({
      capability: "manage_material_instances",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        operation: "set",
        cube_count: 1,
        face_count: 1,
        cubes: [{ uuid: "cube-a", name: "body" }],
      },
    });
    expect(write.invalidates.authoring_domains).toEqual(["TEXTURING"]);
    expect(write.freshness.stale).toEqual(["MATERIAL_RENDER"]);
  });

  test("render-profile inspect and compile-only results preserve authored freshness", () => {
    const inspect = buildControlDelta({
      capability: "manage_render_profile",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "read",
        action: "render_profile",
        summary: { slots: [], assignments: [] },
      },
    });
    expect(inspect.invalidates.authoring_domains).toEqual([]);
    expect(inspect.freshness.basis).toBe("NO_CHANGE");
    expect(inspect.verification_class).toBe("receipt_only");

    const compileOnly = buildControlDelta({
      capability: "manage_render_profile",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "applied",
        action: "render_profile",
        write_transaction: { state: "compile_only", write_count: 0 },
      },
    });
    expect(compileOnly.invalidates.authoring_domains).toEqual([]);
    expect(compileOnly.freshness.basis).toBe("NO_CHANGE");
    expect(compileOnly.verification_class).toBe("receipt_only");

    const singleCompileOnly = buildControlDelta({
      capability: "manage_render_profile",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "applied",
        action: "render_profile",
        write: null,
      },
    });
    expect(singleCompileOnly.invalidates.authoring_domains).toEqual([]);
    expect(singleCompileOnly.freshness.basis).toBe("NO_CHANGE");
    expect(singleCompileOnly.verification_class).toBe("receipt_only");
  });

  test("render-profile writes invalidate only material/render freshness", () => {
    const write = buildControlDelta({
      capability: "manage_render_profile",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "applied",
        action: "render_profile",
        write: {
          path: "/rp/render_controllers/example.render_controllers.json",
          byte_length: 128,
        },
      },
    });

    expect(write.invalidates.authoring_domains).toEqual(["TEXTURING"]);
    expect(write.freshness.stale).toEqual(["MATERIAL_RENDER"]);
    expect(write.freshness.fresh).toContain("TEXTURE_APPEARANCE");
  });

  test("incomplete mixed capability receipts remain conservative", () => {
    for (const capability of [
      "manage_material_instances",
      "manage_render_profile",
    ] as const) {
      const delta = buildControlDelta({
        capability,
        phaseBefore: "texturing",
        phaseAfter: "texturing",
        projectUuid: "project-a",
        succeeded: true,
        result: { action: "unknown-shape" },
      });

      expect(delta.invalidates.authoring_domains, capability).toEqual(["TEXTURING"]);
      expect(delta.freshness.stale, capability).toEqual(["MATERIAL_RENDER"]);
    }
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
