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
