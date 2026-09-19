import { describe, expect, test } from "bun:test";
import {
  resolveGatewayCapabilityEffects,
  validateGatewayCapabilityEffectReceipt,
} from "./capabilityEffects";

describe("resolveGatewayCapabilityEffects", () => {
  test("adopts created project through metadata", () => {
    const resolved = resolveGatewayCapabilityEffects(
      "create_project",
      { project: { uuid: "project-123" } },
      "geometry"
    );

    expect(resolved.effects.projectAffinity).toBe("adopt_created_project");
    expect(resolved.effects.invalidateCatalog).toBe(true);
    expect(resolved.projectUuid).toBe("project-123");
    expect(resolved.authoringPhase).toBeNull();
  });

  test("updates authoring phase while surface change stays result-driven", () => {
    const resolved = resolveGatewayCapabilityEffects(
      "switch_authoring_phase",
      { phase: "animation", surface_changed: true },
      "geometry"
    );

    expect(resolved.effects.phaseAffinity).toBe("update_from_result");
    expect(resolved.effects.invalidateCatalog).toBe(true);
    expect(resolved.authoringPhase).toBe("animation");
    expect(resolved.surfaceChanged).toBe(true);
  });

  test("same AUTHORING surface focus change does not report a surface change", () => {
    const resolved = resolveGatewayCapabilityEffects(
      "switch_authoring_phase",
      { phase: "texturing", surface_changed: false },
      "geometry"
    );

    expect(resolved.effects.invalidateCatalog).toBe(true);
    expect(resolved.authoringPhase).toBe("texturing");
    expect(resolved.surfaceChanged).toBe(false);
  });

  test("ordinary capabilities preserve affinity", () => {
    const resolved = resolveGatewayCapabilityEffects(
      "manage_cubes",
      { changed: true },
      "geometry"
    );

    expect(resolved.effects.projectAffinity).toBe("preserve");
    expect(resolved.effects.phaseAffinity).toBe("preserve");
    expect(resolved.effects.invalidateCatalog).toBe(false);
    expect(resolved.projectUuid).toBeNull();
    expect(resolved.authoringPhase).toBeNull();
  });
  test("fails closed when project-affinity metadata requires a missing UUID", () => {
    const resolved = resolveGatewayCapabilityEffects(
      "create_project",
      { project: {} },
      null
    );

    expect(validateGatewayCapabilityEffectReceipt(resolved, true)).toEqual({
      code: "MISSING_PROJECT_UUID",
      message: expect.stringContaining("project UUID"),
    });
    expect(validateGatewayCapabilityEffectReceipt(resolved, false)).toBeNull();
  });

  test("fails closed when phase-affinity metadata requires a missing phase", () => {
    const resolved = resolveGatewayCapabilityEffects(
      "switch_authoring_phase",
      { surface_changed: true },
      "geometry"
    );

    expect(validateGatewayCapabilityEffectReceipt(resolved, true)).toEqual({
      code: "MISSING_AUTHORING_PHASE",
      message: expect.stringContaining("authoring-phase"),
    });
  });

  test("accepts complete affinity receipts", () => {
    const created = resolveGatewayCapabilityEffects(
      "create_project",
      { project: { uuid: "project-123" } },
      null
    );
    const switched = resolveGatewayCapabilityEffects(
      "switch_authoring_phase",
      { phase: "animation", surface_changed: true },
      "geometry"
    );

    expect(validateGatewayCapabilityEffectReceipt(created, true)).toBeNull();
    expect(validateGatewayCapabilityEffectReceipt(switched, true)).toBeNull();
  });
});
