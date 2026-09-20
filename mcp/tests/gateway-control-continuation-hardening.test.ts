import { describe, expect, test } from "bun:test";
import { buildControlDelta, projectControlDeltaForGateway } from "@/gateway/control";

describe("LazyDesigner Control continuation hardening", () => {
  test("successful phase handoff records the real transition and requests one refresh", () => {
    const delta = buildControlDelta({
      capability: "switch_authoring_phase",
      phaseBefore: "texturing",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
    });
    expect(delta.phase_before).toBe("texturing");
    expect(delta.phase_after).toBe("animation");
    expect(delta.changed).toEqual(["authoring_phase"]);
    expect(delta.requires_status_refresh).toBe(true);
    expect(delta.next_intent).toBe("CONTINUE_NEW_AUTHORING_PHASE");
  });

  test("failed phase handoff is state-neutral and does not invent a refresh", () => {
    const delta = buildControlDelta({
      capability: "switch_authoring_phase",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: false,
    });
    expect(delta.changed).toEqual([]);
    expect(delta.requires_status_refresh).toBe(false);
    expect(delta.next_intent).toBe("RECOVER_CURRENT_OPERATION");
  });

  test("actual visual mutations keep visual verification even with complete structural receipts", () => {
    const delta = buildControlDelta({
      capability: "manage_cubes",
      phaseBefore: "geometry",
      phaseAfter: "geometry",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "applied",
        visual_verdict: "not_evaluated",
        modified: 1,
        before: { uuid: "cube-a" },
        after: { uuid: "cube-a" },
        geometry_effect: { changed_fields: ["rotation"] },
        visual_scope: {
          cube_uuids: ["cube-a"],
          framing: { min: [-1, 0, -1], max: [1, 2, 1] },
        },
      },
    });
    expect(delta.verification_class).toBe("visual");
    expect(delta.verification_scope).toEqual({
      kind: "CUBE_TARGETS",
      cube_uuids: ["cube-a"],
      framing: { min: [-1, 0, -1], max: [1, 2, 1] },
    });
  });

  test("visual animation verification scopes to affected bone and keyframe range", () => {
    const delta = buildControlDelta({
      capability: "manage_animation_timeline",
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        action: "edit",
        animation: { uuid: "anim-a", name: "walk" },
        bone: { uuid: "bone-a", name: "arm" },
        channel: "rotation",
        affected_count: 2,
        affected_keyframes: [
          { uuid: "kf-a", time: 0.25, interpolation: "linear" },
          { uuid: "kf-b", time: 0.75, interpolation: "linear" },
        ],
      },
    });
    expect(delta.verification_class).toBe("visual");
    expect(delta.verification_scope).toEqual({
      kind: "ANIMATION_RANGE",
      animation_uuid: "anim-a",
      bone_uuid: "bone-a",
      channel: "rotation",
      time_range: [0.25, 0.75],
      review: {
        bone_ids: ["bone-a"],
        range: { start: 0.25, end: 0.75 },
        sample_times: [0.25, 0.5, 0.75],
      },
    });
  });

  test("ordinary successful mutation continues without status reread", () => {
    const delta = buildControlDelta({
      capability: "manage_cubes",
      phaseBefore: null,
      phaseAfter: null,
      projectUuid: null,
      succeeded: true,
    });
    expect(delta.changed).toEqual([]);
    expect(delta.requires_status_refresh).toBe(false);
    expect(delta.next_intent).toBe("VERIFY_OR_CONTINUE_GEOMETRY");
  });

  test("Gateway continuation projection removes only static or derivable delta fields", () => {
    const full = buildControlDelta({
      capability: "manage_cubes",
      phaseBefore: "geometry",
      phaseAfter: "geometry",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "applied",
        geometry_effect: { changed_fields: ["rotation"] },
      },
    });
    const projected = projectControlDeltaForGateway(full);

    expect(projected).toMatchObject({
      authoring_domain: "GEOMETRY",
      project_uuid: "project-a",
      freshness: {
        basis: "PRECISE_EFFECT",
        stale: ["GEOMETRY_STRUCTURE"],
      },
      next_intent: "VERIFY_OR_CONTINUE_GEOMETRY",
      requires_status_refresh: false,
    });
    expect(projected).not.toHaveProperty("protocol");
    expect(projected).not.toHaveProperty("capability");
    expect(projected).not.toHaveProperty("source_owner");
    expect(projected).not.toHaveProperty("phase_before");
    expect(projected).not.toHaveProperty("phase_after");
    expect(projected.freshness).not.toHaveProperty("fresh");
    expect(projected.verification_class).toBe(full.verification_class);
    expect(projected.invalidates).toEqual(full.invalidates);
  });

  test("Gateway continuation projection keeps failure uncertainty fail-closed", () => {
    const full = buildControlDelta({
      capability: "manage_animation_timeline",
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: false,
    });
    const projected = projectControlDeltaForGateway(full);

    expect(projected.freshness).toEqual({
      basis: "UNKNOWN_OUTCOME",
      unknown: full.freshness.unknown,
    });
    expect(projected.next_intent).toBe("RECOVER_CURRENT_OPERATION");
  });

  test("Gateway continuation projection preserves real phase transitions", () => {
    const full = buildControlDelta({
      capability: "switch_authoring_phase",
      phaseBefore: "texturing",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
    });
    const projected = projectControlDeltaForGateway(full);

    expect(projected.phase_before).toBe("texturing");
    expect(projected.phase_after).toBe("animation");
    expect(projected.changed).toEqual(["authoring_phase"]);
    expect(projected.requires_status_refresh).toBe(true);
  });

  test("gateway captures phase-before only when the canonical receipt owner requires it", async () => {
    const source = await Bun.file("gateway/index.ts").text();
    expect(source).toContain("capabilityNeedsPhaseSnapshot(capability)");
    expect(source).toContain("deriveControlReceipt");
    expect(source).toContain("phaseBefore,");
    expect(source).toContain("phaseAfter,");
    expect(source).toContain("buildControlDelta");
    expect(source).toContain("projectControlDeltaForGateway");
  });
});
