import { describe, expect, test } from "bun:test";
import {
  CAPABILITY_CORE_MANIFEST,
  capabilityPhaseByName,
  getCapabilityCoreManifestEntry,
} from "./manifest";
import { getCapabilityMetadata } from "../capabilityMetadata";

describe("core capability manifest", () => {
  test("preserves canonical tier, phase, execution and verification behavior", () => {
    expect(getCapabilityMetadata("manage_cubes")).toMatchObject({
      tier: "primary",
      executionClass: "normal",
      verificationClass: "visual",
    });
    expect(capabilityPhaseByName("manage_cubes")).toBe("geometry");

    expect(getCapabilityMetadata("create_project")).toMatchObject({
      tier: "support",
      verificationClass: "receipt_only",
    });
    expect(capabilityPhaseByName("create_project")).toBe("core");

    expect(getCapabilityMetadata("capture_model_views")).toMatchObject({
      tier: "primary",
      executionClass: "heavy",
      verificationClass: "visual",
    });

    expect(getCapabilityMetadata("inspect_particle")).toMatchObject({
      tier: "primary",
      executionClass: "fast",
    });
    expect(capabilityPhaseByName("inspect_particle")).toBe("animation");
  });

  test("preserves effect ownership for project and phase transitions", () => {
    expect(getCapabilityCoreManifestEntry("create_project")?.effects).toEqual({
      projectAffinity: "adopt_created_project",
      phaseAffinity: "preserve",
      invalidateCatalog: true,
    });
    expect(
      getCapabilityCoreManifestEntry("switch_authoring_phase")?.effects
    ).toEqual({
      projectAffinity: "preserve",
      phaseAffinity: "update_from_result",
      invalidateCatalog: true,
    });
  });

  test("centralizes default semantic invalidation scopes", () => {
    expect(
      getCapabilityCoreManifestEntry("manage_cubes")?.defaultStaleScopes
    ).toEqual([
      "GEOMETRY_STRUCTURE",
      "UV_MAPPING",
      "TEXTURE_APPEARANCE",
      "ANIMATION_MOTION",
    ]);
    expect(
      getCapabilityCoreManifestEntry("add_group")?.defaultStaleScopes
    ).toEqual(["GEOMETRY_STRUCTURE", "ANIMATION_MOTION"]);
    expect(
      getCapabilityCoreManifestEntry("configure_material")?.defaultStaleScopes
    ).toEqual(["MATERIAL_RENDER"]);
    expect(
      getCapabilityCoreManifestEntry("manage_animation_effects")
        ?.defaultStaleScopes
    ).toEqual(["ANIMATION_EFFECTS"]);
    expect(
      getCapabilityCoreManifestEntry("save_material_config")?.defaultStaleScopes
    ).toEqual([]);
  });

  test("centralizes authored-state classification for Control projections", () => {
    expect(getCapabilityCoreManifestEntry("manage_cubes")?.stateClass).toBe("geometry");
    expect(getCapabilityCoreManifestEntry("manage_uv_layout")?.stateClass).toBe("uv");
    expect(getCapabilityCoreManifestEntry("import_texture_set")?.stateClass).toBe("texture_material");
    expect(getCapabilityCoreManifestEntry("configure_material")?.stateClass).toBe("material_render");
    expect(getCapabilityCoreManifestEntry("manage_animation_controller")?.stateClass).toBe("animation_controller");
    expect(getCapabilityCoreManifestEntry("save_material_config")?.stateClass).toBe("persistence");
    expect(getCapabilityCoreManifestEntry("get_project_info")?.stateClass).toBeUndefined();
  });

  test("every authored state class has explicit default semantic scope ownership", () => {
    for (const [capability, entry] of CAPABILITY_CORE_MANIFEST) {
      if (entry.stateClass === undefined) continue;

      expect(
        entry.defaultStaleScopes,
        `${capability}: missing defaultStaleScopes`
      ).toBeDefined();

      if (entry.stateClass === "persistence") {
        expect(entry.defaultStaleScopes, capability).toEqual([]);
      } else {
        expect(
          entry.defaultStaleScopes?.length ?? 0,
          `${capability}: authored state class must invalidate at least one semantic scope`
        ).toBeGreaterThan(0);
      }
    }
  });

  test("keeps aliases and maintenance classification centralized", () => {
    expect(
      getCapabilityCoreManifestEntry("manage_uv_layout")?.aliases
    ).toContain("pack islands");
    expect(getCapabilityMetadata("risky_eval").tier).toBe("maintenance");
    expect(getCapabilityMetadata("unknown_future_tool")).toMatchObject({
      tier: "support",
      executionClass: "normal",
      verificationClass: "not_applicable",
    });
  });

  test("does not duplicate manifest keys", () => {
    const keys = [...CAPABILITY_CORE_MANIFEST.keys()];
    expect(new Set(keys).size).toBe(keys.length);
  });
});
