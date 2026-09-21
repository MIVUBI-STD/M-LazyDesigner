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

  test("complete material mutation receipts replace focused rereads", () => {
    for (const operation of ["create", "configure", "assign_channel"] as const) {
      const delta = buildControlDelta({
        capability: "manage_material",
        phaseBefore: "texturing",
        phaseAfter: "texturing",
        projectUuid: "project-a",
        succeeded: true,
        result: {
          operation,
          material: {
            uuid: "material-a",
            name: "metal",
            is_material: true,
            channels: {
              color: null,
              normal: null,
              height: null,
              mer: null,
            },
            config: {
              color_value: [255, 255, 255, 255],
              mer_value: [0, 0, 255],
              subsurface_value: 0,
              saved: false,
            },
          },
        },
      });

      expect(delta.freshness.stale, operation).toEqual(["MATERIAL_RENDER"]);
      expect(delta.verification_class, operation).toBe("receipt_only");
    }
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
    expect(write.verification_class).toBe("focused_read");

    const completeWrite = buildControlDelta({
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
        changes: [
          {
            cube_uuid: "cube-a",
            cube_name: "body",
            face: "north",
            material_name: "metal",
          },
        ],
      },
    });
    expect(completeWrite.verification_class).toBe("receipt_only");
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

  test("complete render-profile write receipts avoid redundant focused rereads", () => {
    const assign = buildControlDelta({
      capability: "manage_render_profile",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "applied",
        action: "render_profile",
        operation: "assign",
        write: {
          key: "render_controller",
          path: "/rp/render_controllers/example.render_controllers.json",
          byte_length: 128,
          replaced_existing: true,
          transaction: "single_atomic",
        },
        render_controller: "controller.render.example",
        bone_pattern: "body*",
        slot: "default",
      },
    });
    expect(assign.verification_class).toBe("receipt_only");
    expect(assign.freshness.stale).toEqual(["MATERIAL_RENDER"]);

    const setSlot = buildControlDelta({
      capability: "manage_render_profile",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "applied",
        action: "render_profile",
        operation: "set_slot",
        slot: "default",
        render_profile: "opaque",
        minecraft_material_code: "entity",
        write: {
          key: "client_entity",
          path: "/rp/entity/example.entity.json",
          byte_length: 256,
          replaced_existing: false,
          transaction: "single_atomic",
        },
        summary: {
          slots: [{ slot: "default", minecraft_material_code: "entity" }],
          assignments: [],
          diagnostics: [],
        },
      },
    });
    expect(setSlot.verification_class).toBe("receipt_only");

    const bind = buildControlDelta({
      capability: "manage_render_profile",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "applied",
        action: "render_profile",
        operation: "bind",
        binding: {
          slot: "default",
          minecraft_material_code: "entity",
        },
        write_transaction: {
          state: "paired_atomic",
          write_count: 2,
        },
        client_entity_write: {
          key: "client_entity",
          path: "/rp/entity/example.entity.json",
          byte_length: 256,
          replaced_existing: true,
          transaction: "paired_atomic",
        },
        render_controller_write: {
          key: "render_controller",
          path: "/rp/render_controllers/example.render_controllers.json",
          byte_length: 192,
          replaced_existing: true,
          transaction: "paired_atomic",
        },
        summary: {
          slots: [{ slot: "default", minecraft_material_code: "entity" }],
          assignments: [{ index: 0, bone_pattern: "body*", expression: "Material.default", direct_slot: "default" }],
          diagnostics: [],
        },
      },
    });
    expect(bind.verification_class).toBe("receipt_only");
  });

  test("incomplete render-profile write receipt stays focused-read", () => {
    const delta = buildControlDelta({
      capability: "manage_render_profile",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "applied",
        action: "render_profile",
        operation: "assign",
        write: {
          path: "/rp/render_controllers/example.render_controllers.json",
          byte_length: 128,
        },
        render_controller: "controller.render.example",
        bone_pattern: "body*",
        slot: "default",
      },
    });

    expect(delta.verification_class).toBe("focused_read");
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

  test("layer rename preserves visual freshness and needs no review read", () => {
    const delta = buildControlDelta({
      capability: "texture_layer_management",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        operation: "rename_layer",
        texture: {
          uuid: "texture-a",
          name: "atlas",
          layers_enabled: true,
          layer_count: 2,
          selected_layer_uuid: "layer-a",
        },
        previous_name: "old",
        layer: {
          uuid: "layer-a",
          name: "new",
          index: 0,
          opacity: 100,
          blend_mode: "default",
          width: 16,
          height: 16,
          offset: [0, 0],
          parent_uuid: null,
        },
      },
    });

    expect(delta.invalidates.authoring_domains).toEqual([]);
    expect(delta.invalidates.workspace_projection).toBe(true);
    expect(delta.invalidates.acceptance_gates).toBe(false);
    expect(delta.freshness.basis).toBe("NO_CHANGE");
    expect(delta.freshness.stale).toEqual([]);
    expect(delta.verification_class).toBe("receipt_only");
  });

  test("rename-only layer metadata batch preserves visual freshness", () => {
    const delta = buildControlDelta({
      capability: "texture_layer_management",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        operation: "batch_metadata",
        update_count: 2,
        recomposed: false,
        texture: {
          uuid: "texture-a",
          name: "atlas",
          layers_enabled: true,
          layer_count: 2,
          selected_layer_uuid: null,
        },
        changes: [
          {
            layer_uuid: "layer-a",
            before: { uuid: "layer-a", name: "A" },
            after: { uuid: "layer-a", name: "A2" },
          },
          {
            layer_uuid: "layer-b",
            before: { uuid: "layer-b", name: "B" },
            after: { uuid: "layer-b", name: "B2" },
          },
        ],
      },
    });

    expect(delta.invalidates.authoring_domains).toEqual([]);
    expect(delta.freshness.basis).toBe("NO_CHANGE");
    expect(delta.verification_class).toBe("receipt_only");
  });

  test("visual layer metadata batch remains Texture-scoped", () => {
    const delta = buildControlDelta({
      capability: "texture_layer_management",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        operation: "batch_metadata",
        update_count: 1,
        recomposed: true,
        texture: {
          uuid: "texture-a",
          name: "atlas",
          layers_enabled: true,
          layer_count: 1,
          selected_layer_uuid: "layer-a",
        },
        changes: [],
      },
    });

    expect(delta.invalidates.authoring_domains).toEqual(["TEXTURING"]);
    expect(delta.freshness.stale).toContain("TEXTURE_APPEARANCE");
    expect(delta.verification_class).toBe("visual");
  });

  test("paint transaction visual verification scopes to the changed atlas region", () => {
    const delta = buildControlDelta({
      capability: "paint_texture_transaction",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "applied",
        texture: { uuid: "texture-a", name: "atlas" },
        revision: { before: "a".repeat(64), after: "b".repeat(64) },
        operation_count: 1,
        pixel_writes: 16,
        affected_rect: [4, 8, 8, 12],
        affected_size: [4, 4],
      },
    });

    expect(delta.verification_class).toBe("visual");
    expect(delta.revision_evidence).toEqual({
      TEXTURE_APPEARANCE: "b".repeat(64),
    });
    expect(delta.verification_scope).toEqual({
      kind: "TEXTURE_REGION",
      texture_uuid: "texture-a",
      affected_rect: [4, 8, 8, 12],
      revision: "b".repeat(64),
      evidence_source: "follow_up_read",
    });
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
