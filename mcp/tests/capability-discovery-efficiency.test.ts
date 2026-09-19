import { describe, expect, test } from "bun:test";
import {
  CAPABILITY_LIFECYCLE_SEARCH_PENALTY,
  getCapabilityMetadata,
} from "../lib/capabilityMetadata";
import { getEnabledToolDefinitions } from "../lib/factories";
import { searchCapabilityCatalog, type BackendTool } from "../gateway/contract";
import {
  classifyMcpToolPhase,
  isMcpToolExposedForPhase,
} from "../lib/authoringPhase";

describe("capability discovery efficiency", () => {
  test("capability metadata separates lifecycle, execution cost, and verification semantics", () => {
    expect(getCapabilityMetadata("create_project")).toMatchObject({
      lifecycle: { stage: "active", replacement: null },
      executionClass: "normal",
      verificationClass: "receipt_only",
    });
    expect(getCapabilityMetadata("get_project_info")).toMatchObject({
      lifecycle: { stage: "active", replacement: null },
      executionClass: "fast",
      verificationClass: "not_applicable",
    });
    expect(getCapabilityMetadata("capture_model_views")).toMatchObject({
      executionClass: "heavy",
      verificationClass: "visual",
    });
    expect(getCapabilityMetadata("modify_group").verificationClass).toBe(
      "focused_read"
    );
    expect(getCapabilityMetadata("duplicate_element").verificationClass).toBe("visual");
    expect(getCapabilityMetadata("bone_rigging").verificationClass).toBe("focused_read");
    expect(getCapabilityMetadata("add_texture_group").verificationClass).toBe("focused_read");
    expect(getCapabilityMetadata("import_texture_set").verificationClass).toBe("focused_read");
    for (const capability of ["gradient_tool", "copy_brush_tool", "texture_layer_management"]) {
      expect(getCapabilityMetadata(capability).verificationClass, capability).toBe("visual");
    }
    expect(CAPABILITY_LIFECYCLE_SEARCH_PENALTY.deprecated).toBeLessThan(
      CAPABILITY_LIFECYCLE_SEARCH_PENALTY.active
    );
  });

  test("Gateway discovery handles representative Indonesian authoring language", () => {
    const tools = Object.entries(getEnabledToolDefinitions()).map(
      ([name, tool]) => ({
        name,
        description: tool.description,
        annotations: tool.annotations,
      })
    ) as BackendTool[];

    const cases = [
      ["buat kubus baru untuk badan model", "manage_cubes"],
      ["ubah ukuran kubus yang ini", "manage_cubes"],
      ["ubah pivot tulang pintu", "modify_group"],
      ["geser posisi bone ini", "modify_group"],
      ["buat titik pegangan di tangan", "manage_locator"],
      ["edit pixel ini secara presisi", "paint_texture_transaction"],
      ["tambah keyframe rotasi tangan", "manage_animation_timeline"],
      ["atur timeline animasi jadi loop", "manage_animation_timeline"],
      ["buat controller animasi dengan beberapa state", "manage_animation_controller"],
      ["tambahkan particle ke animasi", "manage_animation_effects"],
      ["buat particle asap", "manage_particle"],
      ["ubah particle emitter ini", "manage_particle"],
    ] as const;

    for (const [query, expected] of cases) {
      const results = searchCapabilityCatalog(tools, query, 3);
      expect(
        results.map((result) => result.capability_id),
        query
      ).toContain(expected);
    }
  });

  test("canonical semantic geometry capabilities outrank overlapping rig helper", () => {
    for (const capability of [
      "add_group",
      "modify_group",
      "reparent_element",
      "remove_element",
      "rename_element",
    ]) {
      expect(getCapabilityMetadata(capability).tier).toBe("primary");
    }

    expect(getCapabilityMetadata("add_group").searchAliases).toEqual(
      expect.arrayContaining(["create bone", "bone batch"])
    );
    expect(getCapabilityMetadata("modify_group").searchAliases).toEqual(
      expect.arrayContaining(["set pivot", "bone pivot"])
    );
    expect(getCapabilityMetadata("reparent_element").searchAliases).toEqual(
      expect.arrayContaining(["parent bone", "unparent bone"])
    );

    expect(getCapabilityMetadata("bone_rigging").tier).toBe("support");
    expect(getCapabilityMetadata("bone_rigging").searchAliases).toEqual(
      expect.arrayContaining(["inverse kinematics", "ik target", "mirror bone"])
    );
  });

  test("texture state and legacy helpers stay below semantic authoring tools", () => {
    expect(getCapabilityMetadata("activate_texture").tier).toBe("support");
    expect(getCapabilityMetadata("apply_texture").tier).toBe("support");

    for (const capability of [
      "create_texture",
      "paint_texture_transaction",
      "paint_with_brush",
      "manage_material",
    ]) {
      expect(getCapabilityMetadata(capability).tier).toBe("primary");
    }
  });

  test("selection helpers remain authoring support instead of animation surface", () => {
    for (const capability of ["select_all_of_type", "get_selection"]) {
      expect(classifyMcpToolPhase(capability, "elements")).toBe("geometry");
      expect(isMcpToolExposedForPhase(capability, "elements", "geometry")).toBe(true);
      expect(isMcpToolExposedForPhase(capability, "elements", "texturing")).toBe(true);
      expect(isMcpToolExposedForPhase(capability, "elements", "animation")).toBe(false);
    }
  });
});
