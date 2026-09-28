import { describe, expect, test } from "bun:test";
import { buildControlDelta, projectControlDeltaForGateway } from "@/gateway/control";
import { CAPABILITY_CORE_MANIFEST } from "@/lib/capabilities/manifest";
import {
  ANIMATION_MOTION_MUTATIONS,
  MATERIAL_RENDER_MUTATIONS,
  STATE_MUTATIONS,
  TEXTURE_APPEARANCE_MUTATIONS,
} from "@/gateway/control/delta/policy";

describe("LazyDesigner Control continuation hardening", () => {
  test("capability manifest and Control mutation policy cannot silently drift apart", () => {
    const manifestNames = new Set(CAPABILITY_CORE_MANIFEST.keys());

    for (const capability of STATE_MUTATIONS) {
      expect(manifestNames.has(capability), capability).toBe(true);
      const entry = CAPABILITY_CORE_MANIFEST.get(capability);
      expect(entry?.phase, capability).toBeDefined();
      expect(entry?.verificationClass, capability).not.toBeUndefined();
      expect(entry?.verificationClass, capability).not.toBe("not_applicable");
    }

    for (const scopedSet of [
      TEXTURE_APPEARANCE_MUTATIONS,
      MATERIAL_RENDER_MUTATIONS,
      ANIMATION_MOTION_MUTATIONS,
    ]) {
      for (const capability of scopedSet) {
        expect(STATE_MUTATIONS.has(capability), capability).toBe(true);
      }
    }

    const nonAuthoredVerificationExceptions = new Set([
      "capture_model_views",
      "switch_authoring_phase",
      "save_material_config",
    ]);

    for (const [capability, entry] of CAPABILITY_CORE_MANIFEST) {
      if (
        entry.phase == null ||
        entry.verificationClass == null ||
        entry.verificationClass === "not_applicable" ||
        nonAuthoredVerificationExceptions.has(capability)
      ) {
        continue;
      }
      expect(STATE_MUTATIONS.has(capability), capability).toBe(true);
    }
  });

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

  test("direct canonical mutation capabilities never preserve stale evidence as NO_CHANGE", () => {
    const cases = [
      ["apply_texture", "TEXTURE_APPEARANCE"],
      ["configure_material", "MATERIAL_RENDER"],
      ["assign_texture_channel", "MATERIAL_RENDER"],
      ["set_face_material_instance", "MATERIAL_RENDER"],
      ["bulk_set_material_instances", "MATERIAL_RENDER"],
      ["clear_material_instances", "MATERIAL_RENDER"],
      ["manage_keyframes", "ANIMATION_MOTION"],
      ["animation_graph_editor", "ANIMATION_MOTION"],
      ["animation_timeline", "ANIMATION_MOTION"],
      ["batch_keyframe_operations", "ANIMATION_MOTION"],
      ["animation_copy_paste", "ANIMATION_MOTION"],
    ] as const;

    for (const [capability, staleScope] of cases) {
      const delta = buildControlDelta({
        capability,
        phaseBefore: null,
        phaseAfter: null,
        projectUuid: "project-a",
        succeeded: true,
        result: { execution: "applied" },
      });

      expect(delta.freshness.basis, capability).not.toBe("NO_CHANGE");
      expect(delta.freshness.stale, capability).toContain(staleScope);
      expect(delta.invalidates.workspace_projection, capability).toBe(true);
      expect(delta.invalidates.acceptance_gates, capability).toBe(true);
      expect(delta.verification_class, capability).not.toBe("not_applicable");
    }
  });

  test("incomplete animation receipts never downgrade verification to receipt-only", () => {
    const controller = buildControlDelta({
      capability: "manage_animation_controller",
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "applied",
        operation_count: 1,
        controller: {
          uuid: "controller-a",
          name: "controller.animation.test",
          initial_state: null,
          state_count: 1,
        },
        affected_states: [],
        created: {},
        removed: {},
      },
    });
    expect(controller.verification_class).toBe("focused_read");

    const malformedCreatedIdentity = buildControlDelta({
      capability: "manage_animation_controller",
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "applied",
        operation_count: 1,
        controller: {
          uuid: "controller-a",
          name: "controller.animation.test",
          initial_state: null,
          state_count: 1,
        },
        affected_states: [],
        created: {
          states: [{ uuid: "", name: "broken" }],
          transitions: [],
          animation_links: [],
          sounds: [],
          particles: [],
        },
        removed: {
          states: [],
          transitions: [],
          animation_links: [],
          sounds: [],
          particles: [],
        },
      },
    });
    expect(malformedCreatedIdentity.verification_class).toBe("focused_read");

    const effects = buildControlDelta({
      capability: "manage_animation_effects",
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        animation: { uuid: "anim-a", name: "walk" },
        operation_count: 2,
        results: [
          {
            channel: "sound",
            keyframe_uuid: "kf-a",
            time: 0.5,
            data_point_index: 0,
            effect: "step",
            locator: null,
          },
        ],
      },
    });
    expect(effects.verification_class).toBe("focused_read");
  });

  test("complete animation receipts retain receipt-only continuation", () => {
    const controller = buildControlDelta({
      capability: "manage_animation_controller",
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "applied",
        operation_count: 1,
        controller: {
          uuid: "controller-a",
          name: "controller.animation.test",
          initial_state: { uuid: "state-a", name: "idle" },
          state_count: 1,
        },
        affected_states: [
          {
            uuid: "state-a",
            name: "idle",
            animations: [],
            transitions: [],
            sounds: [],
            particles: [],
          },
        ],
        created: {
          states: [],
          transitions: [],
          animation_links: [],
          sounds: [],
          particles: [],
        },
        removed: {
          states: [],
          transitions: [],
          animation_links: [],
          sounds: [],
          particles: [],
        },
      },
    });
    expect(controller.verification_class).toBe("receipt_only");

    const effects = buildControlDelta({
      capability: "manage_animation_effects",
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        animation: { uuid: "anim-a", name: "walk" },
        operation_count: 1,
        results: [
          {
            channel: "particle",
            keyframe_uuid: "kf-a",
            time: 0.5,
            data_point_index: 0,
            effect: "minecraft:spark",
            locator: null,
            bind_to_actor: null,
            pre_effect_script: null,
          },
        ],
      },
    });
    expect(effects.verification_class).toBe("receipt_only");
  });

  test("UV, history, and project-boundary mutations invalidate the evidence they can make stale", () => {
    const uv = buildControlDelta({
      capability: "manage_uv_layout",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: { execution: "applied" },
    });
    expect(uv.freshness.basis).toBe("PRECISE_EFFECT");
    expect(uv.freshness.stale).toEqual([
      "UV_MAPPING",
      "TEXTURE_APPEARANCE",
    ]);
    expect(uv.freshness.fresh).toContain("MATERIAL_RENDER");
    expect(uv.invalidates.authoring_domains).toEqual(["TEXTURING"]);
    expect(uv.invalidates.acceptance_gates).toBe(true);

    for (const capability of ["undo", "redo", "create_project"] as const) {
      const delta = buildControlDelta({
        capability,
        phaseBefore: "geometry",
        phaseAfter: "geometry",
        projectUuid: "project-a",
        succeeded: true,
        result: {},
      });
      expect(delta.freshness.basis, capability).toBe("CONSERVATIVE_EFFECT");
      expect(delta.freshness.stale, capability).toHaveLength(8);
      expect(delta.invalidates.authoring_domains, capability).toEqual([
        "GEOMETRY",
        "TEXTURING",
        "ANIMATION",
      ]);
      expect(delta.invalidates.workspace_projection, capability).toBe(true);
      expect(delta.invalidates.acceptance_gates, capability).toBe(true);
    }
  });

  test("receipt-proven direct animation read/view actions preserve authored freshness", () => {
    const cases = [
      {
        capability: "manage_keyframes",
        result: {
          action: "select",
          animation: { uuid: "anim-a", name: "walk" },
          bone: { uuid: "bone-a", name: "arm" },
          channel: "rotation",
          affected_count: 1,
          affected_keyframes: [{ uuid: "kf-a", time: 0.5 }],
        },
      },
      {
        capability: "animation_copy_paste",
        result: {
          action: "copy",
          scope: "animation_clipboard_only",
          copied_keyframes: 3,
        },
      },
      {
        capability: "animation_timeline",
        result: {
          action: "set_time",
          scope: "timeline_view_only",
        },
      },
    ] as const;

    for (const { capability, result } of cases) {
      const delta = buildControlDelta({
        capability,
        phaseBefore: "animation",
        phaseAfter: "animation",
        projectUuid: "project-a",
        succeeded: true,
        result,
      });
      expect(delta.freshness.basis, capability).toBe("NO_CHANGE");
      expect(delta.invalidates.authoring_domains, capability).toEqual([]);
      expect(delta.invalidates.workspace_projection, capability).toBe(false);
      expect(delta.invalidates.acceptance_gates, capability).toBe(false);
      expect(delta.verification_class, capability).toBe("receipt_only");
    }
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
