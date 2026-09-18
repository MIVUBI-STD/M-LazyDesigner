import { describe, expect, test } from "bun:test";
import { buildControlDelta } from "@/gateway/control";

describe("LazyDesigner Control minimum invalidation", () => {
  test("local cube transform does not reset unrelated Texture or Animation", () => {
    const delta = buildControlDelta({
      capability: "manage_cubes",
      phaseBefore: null,
      phaseAfter: null,
      projectUuid: "project-a",
      succeeded: true,
      result: {
        geometry_effect: {
          changed_fields: ["rotation", "origin"],
        },
      },
    });

    expect(delta.invalidates.authoring_domains).toEqual(["GEOMETRY"]);
    expect(delta.freshness.basis).toBe("PRECISE_EFFECT");
    expect(delta.freshness.stale).toEqual(["GEOMETRY_STRUCTURE"]);
    expect(delta.freshness.fresh).toContain("TEXTURE_APPEARANCE");
    expect(delta.freshness.fresh).toContain("ANIMATION_MOTION");
  });

  test("shape or UV-sensitive cube changes invalidate dependent Texture and Animation knowledge", () => {
    const delta = buildControlDelta({
      capability: "manage_cubes",
      phaseBefore: null,
      phaseAfter: null,
      projectUuid: "project-a",
      succeeded: true,
      result: {
        effects: [
          {
            geometry_effect: {
              changed_fields: ["from", "to"],
            },
          },
        ],
      },
    });

    expect(delta.invalidates.authoring_domains).toEqual([
      "GEOMETRY",
      "TEXTURING",
      "ANIMATION",
    ]);
    expect(delta.freshness.stale).toEqual([
      "GEOMETRY_STRUCTURE",
      "UV_MAPPING",
      "TEXTURE_APPEARANCE",
      "ANIMATION_MOTION",
    ]);
    expect(delta.freshness.fresh).toContain("MATERIAL_RENDER");
    expect(delta.freshness.fresh).toContain("ANIMATION_CONTROLLER");
  });

  test("hierarchy changes invalidate Geometry and Animation but preserve Texture by default", () => {
    const delta = buildControlDelta({
      capability: "reparent_element",
      phaseBefore: null,
      phaseAfter: null,
      projectUuid: "project-a",
      succeeded: true,
    });

    expect(delta.invalidates.authoring_domains).toEqual([
      "GEOMETRY",
      "ANIMATION",
    ]);
    expect(delta.freshness.stale).toEqual([
      "GEOMETRY_STRUCTURE",
      "ANIMATION_MOTION",
    ]);
    expect(delta.freshness.fresh).toContain("UV_MAPPING");
    expect(delta.freshness.fresh).toContain("TEXTURE_APPEARANCE");
  });

  test("duplicated geometry invalidates Geometry plus dependent Texture and Animation evidence", () => {
    const delta = buildControlDelta({
      capability: "duplicate_element",
      phaseBefore: null,
      phaseAfter: null,
      projectUuid: "project-a",
      succeeded: true,
    });

    expect(delta.invalidates.authoring_domains).toEqual([
      "GEOMETRY",
      "TEXTURING",
      "ANIMATION",
    ]);
    expect(delta.invalidates.workspace_projection).toBe(true);
    expect(delta.invalidates.acceptance_gates).toBe(true);
  });

  test("paint/material changes invalidate only Texture knowledge", () => {
    for (const capability of ["paint_with_brush", "manage_material"] as const) {
      const delta = buildControlDelta({
        capability,
        phaseBefore: null,
        phaseAfter: null,
        projectUuid: "project-a",
        succeeded: true,
      });
      expect(delta.invalidates.authoring_domains, capability).toEqual(["TEXTURING"]);
    }
  });

  test("animation changes invalidate only Animation knowledge", () => {
    const delta = buildControlDelta({
      capability: "manage_animation_timeline",
      phaseBefore: null,
      phaseAfter: null,
      projectUuid: "project-a",
      succeeded: true,
    });
    expect(delta.invalidates.authoring_domains).toEqual(["ANIMATION"]);
    expect(delta.freshness.stale).toEqual(["ANIMATION_MOTION"]);
    expect(delta.freshness.fresh).toContain("ANIMATION_CONTROLLER");
    expect(delta.freshness.fresh).toContain("ANIMATION_EFFECTS");
    expect(delta.freshness.fresh).toContain("PARTICLE_SYSTEM");
  });

  test("selection, playback, and clipboard-only animation operations preserve authored freshness", () => {
    for (const result of [
      { action: "select", animation: { uuid: "a", name: "A" } },
      { action: "play", animation: { uuid: "a", name: "A" } },
      { action: "set_time", timeline_time: 0.5 },
      { action: "expand_bones", scope: "timeline_view_only" },
      { action: "copy", scope: "animation_clipboard_only", copied_keyframes: 4 },
      { action: "loop", changed: false, loop_mode: "loop" },
    ]) {
      const delta = buildControlDelta({
        capability: "manage_animation_timeline",
        phaseBefore: "animation",
        phaseAfter: "animation",
        projectUuid: "project-a",
        succeeded: true,
        result,
      });

      expect(delta.invalidates.authoring_domains).toEqual([]);
      expect(delta.invalidates.workspace_projection).toBe(false);
      expect(delta.freshness.basis).toBe("NO_CHANGE");
      expect(delta.freshness.stale).toEqual([]);
      expect(delta.freshness.fresh).toHaveLength(8);
      expect(delta.verification_class).toBe("receipt_only");
    }
  });

  test("particle preparation without write or preview preserves authored freshness", () => {
    const delta = buildControlDelta({
      capability: "manage_particle",
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        valid: true,
        artifact_ready: true,
        wrote_to_path: null,
        preview_path: null,
        texture_dependency: null,
      },
    });

    expect(delta.invalidates.authoring_domains).toEqual([]);
    expect(delta.invalidates.workspace_projection).toBe(false);
    expect(delta.freshness.basis).toBe("NO_CHANGE");
    expect(delta.freshness.fresh).toHaveLength(8);
    expect(delta.verification_class).toBe("receipt_only");
  });

  test("particle write remains a Particle-scoped authored mutation", () => {
    const delta = buildControlDelta({
      capability: "manage_particle",
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        valid: true,
        artifact_ready: true,
        wrote_to_path: "/rp/example.particle.json",
        preview_path: null,
        texture_dependency: null,
      },
    });

    expect(delta.invalidates.authoring_domains).toEqual(["ANIMATION"]);
    expect(delta.freshness.stale).toEqual(["PARTICLE_SYSTEM"]);
    expect(delta.verification_class).toBe("focused_read");
  });

  test("complete animation-effects receipt is sufficient for continuation without reread", () => {
    const delta = buildControlDelta({
      capability: "manage_animation_effects",
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        animation: { uuid: "anim-a", name: "idle" },
        operation_count: 2,
        results: [
          {
            channel: "particle",
            keyframe_uuid: "kf-a",
            time: 0.25,
            data_point_index: 0,
            effect: "mivubi:dust",
            locator: "hand",
            bind_to_actor: null,
            pre_effect_script: null,
          },
          {
            channel: "sound",
            removed: {
              keyframe_uuid: "kf-b",
              data_point_index: 0,
              remaining: [],
            },
          },
        ],
      },
    });

    expect(delta.freshness.stale).toEqual(["ANIMATION_EFFECTS"]);
    expect(delta.verification_class).toBe("receipt_only");
  });

  test("incomplete animation-effects receipt retains focused-read verification", () => {
    const delta = buildControlDelta({
      capability: "manage_animation_effects",
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        animation: { uuid: "anim-a", name: "idle" },
        operation_count: 1,
        results: [{ channel: "particle" }],
      },
    });

    expect(delta.verification_class).toBe("focused_read");
  });

  test("complete animation-controller receipt replaces focused reread", () => {
    const delta = buildControlDelta({
      capability: "manage_animation_controller",
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "applied",
        action: "updated",
        operation_count: 2,
        controller: {
          uuid: "controller-a",
          name: "controller.animation.mob",
          initial_state: { uuid: "state-a", name: "default" },
          state_count: 2,
        },
        affected_states: [
          {
            uuid: "state-a",
            name: "default",
            on_entry: null,
            on_exit: null,
            blend_transition: 0,
            blend_transition_curve: null,
            blend_via_shortest_path: false,
            animations: [],
            transitions: [
              { uuid: "transition-a", target_uuid: "state-b", condition: "query.is_moving" },
            ],
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

    expect(delta.freshness.stale).toEqual(["ANIMATION_CONTROLLER"]);
    expect(delta.verification_class).toBe("receipt_only");
  });

  test("animation controller and particle mutations remain change-scoped", () => {
    const cases = [
      ["manage_particle", "PARTICLE_SYSTEM"],
    ] as const;

    for (const [capability, staleScope] of cases) {
      const delta = buildControlDelta({
        capability,
        phaseBefore: "animation",
        phaseAfter: "animation",
        projectUuid: "project-a",
        succeeded: true,
      });
      expect(delta.invalidates.authoring_domains, capability).toEqual(["ANIMATION"]);
      expect(delta.freshness.basis, capability).toBe("PRECISE_EFFECT");
      expect(delta.freshness.stale, capability).toEqual([staleScope]);
      expect(delta.freshness.fresh, capability).not.toContain(staleScope);
    }
  });

  test("failed mutation does not make freshness claims", () => {
    const delta = buildControlDelta({
      capability: "manage_animation_timeline",
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: false,
    });

    expect(delta.freshness.basis).toBe("UNKNOWN_OUTCOME");
    expect(delta.freshness.stale).toEqual([]);
    expect(delta.freshness.fresh).toEqual([]);
    expect(delta.freshness.unknown).toHaveLength(8);
  });

  test("unknown Geometry mutation receipt fails safe instead of pretending precision", () => {
    const delta = buildControlDelta({
      capability: "manage_cubes",
      phaseBefore: null,
      phaseAfter: null,
      projectUuid: "project-a",
      succeeded: true,
    });
    expect(delta.invalidates.authoring_domains).toEqual([
      "GEOMETRY",
      "TEXTURING",
      "ANIMATION",
    ]);
    expect(delta.freshness.basis).toBe("CONSERVATIVE_EFFECT");
    expect(delta.freshness.stale).toEqual([
      "GEOMETRY_STRUCTURE",
      "UV_MAPPING",
      "TEXTURE_APPEARANCE",
      "ANIMATION_MOTION",
    ]);
  });
});
