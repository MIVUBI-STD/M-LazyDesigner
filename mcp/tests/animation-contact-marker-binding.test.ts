import { describe, expect, test } from "bun:test";
import {
  bindExplicitContactMarkers,
  prepareContactSamplingPlan,
  CONTACT_MARKER_BINDING_LIMIT,
  CONTACT_SAMPLING_MAX_FRAMES,
  type ContactMarkerPoseSnapshot,
  type ExplicitContactMarkerBinding,
} from "@/lib/animation/contactMarkerBinding";

function pose(): ContactMarkerPoseSnapshot {
  return {
    state: "OBSERVED",
    source: "CURRENT_EDITOR_PREVIEW_ONLY",
    project_uuid: "project-a",
    animation_uuid: "animation-a",
    group_uuid: "bone-a",
    timeline_time_observed: 0.5,
    frame_pose_synchronized: false,
    contact_marker_attested: false,
    native_animation_sampling_performed: false,
    visual_verdict: "NOT_EVALUATED",
    locator_candidates: {
      state: "AVAILABLE",
      scope: "DIRECT_CHILD_NATIVE_LOCATORS_ONLY",
      role: "UNASSIGNED_CONTACT_INTENT",
      count: 2,
      observed_count: 2,
      candidates: [
        { uuid: "locator-a", state: "OBSERVED", world_position: [2, 0, 3] },
        { uuid: "locator-b", state: "OBSERVED", world_position: [0, 4, 1] },
      ],
    },
  };
}

function role(overrides: Partial<ExplicitContactMarkerBinding> = {}): ExplicitContactMarkerBinding {
  return {
    id: "foot-left-binding",
    role: "FOOT_PLANT",
    intent_authority: "DECLARED_USER_INTENT",
    evidence_ref: "user:explicit-foot-choice",
    project_uuid: "project-a",
    animation_uuid: "animation-a",
    group_uuid: "bone-a",
    locator_uuid: "locator-a",
    ...overrides,
  };
}

describe("explicit native Locator contact-role binding", () => {
  test("only an explicit exact UUID role is linked, with traceable declared intent", () => {
    const input = pose();
    const before = JSON.stringify(input);
    const result = bindExplicitContactMarkers({ snapshot: input, bindings: [role()] });
    expect(result).toMatchObject({
      state: "LINKED_CURRENT_PREVIEW_ONLY",
      requested_count: 1,
      linked_count: 1,
      unresolved_count: 0,
      role_authority: "CALLER_DECLARED_NOT_INDEPENDENTLY_VERIFIED",
      frame_pose_synchronized: false,
      physical_contact_verified: false,
      visual_verdict: "NOT_EVALUATED",
      bindings: [{
        id: "foot-left-binding",
        role: "FOOT_PLANT",
        locator_uuid: "locator-a",
        evidence_ref: "user:explicit-foot-choice",
        intent_authority: "DECLARED_USER_INTENT",
        state: "LINKED_CURRENT_PREVIEW_ONLY",
        world_position: [2, 0, 3],
      }],
    });
    expect(JSON.stringify(input)).toBe(before);
  });

  test("does not infer semantics from Locator names or missing user choice", () => {
    const result = bindExplicitContactMarkers({ snapshot: pose(), bindings: [] });
    expect(result).toMatchObject({
      state: "UNVERIFIED",
      reason: "CONTACT_BINDING_SELECTION_INVALID",
      linked_count: 0,
      bindings: [],
    });
  });

  test("matches project, animation and Group UUIDs independently", () => {
    for (const override of [
      { project_uuid: "another-project" },
      { animation_uuid: "another-animation" },
      { group_uuid: "another-bone" },
    ]) {
      const result = bindExplicitContactMarkers({
        snapshot: pose(), bindings: [role(override)],
      });
      expect(result).toMatchObject({
        state: "PARTIAL_UNVERIFIED",
        linked_count: 0,
        unresolved_count: 1,
        bindings: [{
          state: "UNVERIFIED", reason: "SNAPSHOT_IDENTITY_MISMATCH",
          world_position: null,
        }],
      });
    }
  });

  test("missing Locator and unavailable marker world coordinates cannot link", () => {
    const unavailable = pose();
    unavailable.locator_candidates!.state = "PARTIAL";
    unavailable.locator_candidates!.count = 1;
    unavailable.locator_candidates!.observed_count = 0;
    unavailable.locator_candidates!.candidates = [
      { uuid: "locator-a", state: "UNVERIFIED", world_position: null },
    ];
    const results = [
      bindExplicitContactMarkers({ snapshot: pose(), bindings: [role({ locator_uuid: "unknown" })] }),
      bindExplicitContactMarkers({ snapshot: unavailable, bindings: [role()] }),
    ];
    expect(results[0].bindings[0]).toMatchObject({
      state: "UNVERIFIED", reason: "LOCATOR_NOT_IN_CURRENT_BONE",
    });
    expect(results[1].bindings[0]).toMatchObject({
      state: "UNVERIFIED", reason: "LOCATOR_WORLD_POSITION_UNVERIFIED",
    });
  });

  test("nonfinite marker coordinates and mixed valid/invalid roles stay partial", () => {
    const snapshot = pose();
    snapshot.locator_candidates!.candidates = [
      { uuid: "locator-a", state: "OBSERVED", world_position: [2, 0, 3] },
      { uuid: "locator-b", state: "OBSERVED", world_position: [Number.NaN, 0, 1] },
    ];
    const result = bindExplicitContactMarkers({
      snapshot,
      bindings: [
        role(),
        role({
          id: "grip", role: "HAND_GRIP",
          locator_uuid: "locator-b",
          intent_authority: "DECLARED_REFERENCE_INTENT",
          evidence_ref: "reference:approved-grip",
        }),
      ],
    });
    expect(result).toMatchObject({
      state: "PARTIAL_UNVERIFIED", linked_count: 1, unresolved_count: 1,
      bindings: [
        { state: "LINKED_CURRENT_PREVIEW_ONLY" },
        { state: "UNVERIFIED", reason: "LOCATOR_WORLD_POSITION_INVALID" },
      ],
    });
  });

  test("ambiguous binding IDs or locator reuse reject the entire set", () => {
    for (const second of [
      role({ locator_uuid: "locator-b" }),
      role({ id: "different-id" }),
    ]) {
      const result = bindExplicitContactMarkers({
        snapshot: pose(), bindings: [role(), second],
      });
      expect(result).toMatchObject({
        state: "UNVERIFIED", reason: "CONTACT_BINDING_DUPLICATE_IDENTITY",
        linked_count: 0, bindings: [],
      });
    }
  });

  test("invalid semantic role or unreferenced declaration cannot silently certify role", () => {
    for (const override of [
      { evidence_ref: "  " },
      { intent_authority: "AUTOMATIC" as any },
      { role: "GUESSED_FOOT" as any },
      { id: "" },
    ]) {
      expect(bindExplicitContactMarkers({
        snapshot: pose(), bindings: [role(override)],
      }).reason).toBe("CONTACT_BINDING_DECLARATION_INVALID");
    }
  });

  test("rejects unsupported provenance and unsynchronized pose claims", () => {
    for (const override of [
      { state: "UNVERIFIED" as const },
      { source: "KEYFRAMES_ONLY" },
      { frame_pose_synchronized: true },
      { contact_marker_attested: true },
      { native_animation_sampling_performed: true },
      { visual_verdict: "PASS" },
      { timeline_time_observed: Number.NaN },
    ]) {
      const result = bindExplicitContactMarkers({
        snapshot: { ...pose(), ...override } as ContactMarkerPoseSnapshot,
        bindings: [role()],
      });
      expect(result).toMatchObject({
        state: "UNVERIFIED", reason: "CURRENT_POSE_NOT_ELIGIBLE_FOR_ROLE_LINK",
      });
    }
  });

  test("cannot bypass the direct-child evidence and duplicate observed Locator guard", () => {
    const wrongScope = pose();
    wrongScope.locator_candidates!.scope = "ALL_DESCENDANTS";
    expect(bindExplicitContactMarkers({ snapshot: wrongScope, bindings: [role()] }).reason)
      .toBe("DIRECT_NATIVE_LOCATOR_EVIDENCE_UNAVAILABLE");
    const duplicate = pose();
    duplicate.locator_candidates!.candidates = [
      { uuid: "locator-a", state: "OBSERVED", world_position: [2, 0, 3] },
      { uuid: "locator-a", state: "OBSERVED", world_position: [1, 0, 3] },
    ];
    expect(bindExplicitContactMarkers({ snapshot: duplicate, bindings: [role()] }).reason)
      .toBe("AMBIGUOUS_LOCATOR_SNAPSHOT_IDENTITY");
  });

  test("summary counts, advertised scope and preview time cannot be forged", () => {
    for (const wrong of [
      { observed_count: 0 },
      { count: 99 },
      { state: "NONE" as const },
    ]) {
      const snapshot = pose();
      snapshot.locator_candidates = { ...snapshot.locator_candidates!, ...wrong };
      expect(bindExplicitContactMarkers({ snapshot, bindings: [role()] }).reason)
        .toBe("LOCATOR_SUMMARY_INCONSISTENT");
    }
    const staleClock = pose();
    staleClock.timeline_time_observed = -5;
    expect(bindExplicitContactMarkers({ snapshot: staleClock, bindings: [role()] }).reason)
      .toBe("CURRENT_POSE_NOT_ELIGIBLE_FOR_ROLE_LINK");
  });

  test("source budgets cap requested bindings and snapshot candidate counts", () => {
    const tooMany = Array.from({ length: CONTACT_MARKER_BINDING_LIMIT + 1 }, (_, i) =>
      role({ id: "role-" + i, locator_uuid: "locator-" + i })
    );
    expect(bindExplicitContactMarkers({ snapshot: pose(), bindings: tooMany }).reason)
      .toBe("CONTACT_BINDING_SELECTION_INVALID");
    const largeSnapshot = pose();
    largeSnapshot.locator_candidates!.candidates = Array.from(
      { length: CONTACT_MARKER_BINDING_LIMIT + 1 }, (_, i) => ({
        uuid: "loc-" + i, state: "OBSERVED" as const,
        world_position: [0, 0, 0] as const,
      })
    );
    expect(bindExplicitContactMarkers({ snapshot: largeSnapshot, bindings: [role()] }).reason)
      .toBe("DIRECT_NATIVE_LOCATOR_EVIDENCE_UNAVAILABLE");
  });
});


describe("read-only contact sampling schedule preflight", () => {
  const request = () => ({
    snapshot: pose(),
    bindings: [role()],
    window: { start: 0, end: 1, max_gap_seconds: 0.25 },
    duration_seconds: 4,
  });

  test("valid source timing still fails the native restoration acceptance gate", () => {
    const result = prepareContactSamplingPlan(request());
    expect(result.state).toBe("PREPARED_SOURCE_ONLY");
    expect(result.restoration_contract).toMatchObject({
      state: "BLOCKED_NATIVE_VERIFICATION",
      reason: "FULL_PREVIEW_RESTORATION_NOT_ATTESTED",
      checked_source_plan: true,
      native_sampler_enabled: false,
      all_state_surfaces_restored: false,
      required_surface_count: 10,
    });
    expect(result.restoration_contract.unresolved_surfaces.every(
      (row) => row.native_proof === "NOT_EXECUTED"
    )).toBe(true);
  });

  test("invalid schedule also carries recovery refusal rather than losing the gate", () => {
    const result = prepareContactSamplingPlan({
      ...request(), window: { start: 3, end: 2, max_gap_seconds: 0.2 },
    });
    expect(result.state).toBe("UNVERIFIED");
    expect(result.restoration_contract).toMatchObject({
      state: "BLOCKED_NATIVE_VERIFICATION",
      reason: "SAMPLING_PLAN_NOT_PREPARED",
      native_sampler_enabled: false,
      required_surface_count: 10,
    });
    expect(result.sample_times).toEqual([]);
  });

  test("partitions an exact window without moving the Timeline or sampling poses", () => {
    const input = request();
    const before = JSON.stringify(input);
    const result = prepareContactSamplingPlan(input);
    expect(result).toMatchObject({
      state: "PREPARED_SOURCE_ONLY",
      native_sampling_state: "NOT_EXECUTED",
      sampling_authority: "NO_RUNTIME_SAMPLING_AUTHORIZED",
      visual_verdict: "NOT_EVALUATED",
      preview_restoration_verified: false,
      full_motion_coverage_verified: false,
      frame_count: 5,
      sample_count: 0,
      sample_times: [0, 0.25, 0.5, 0.75, 1],
      markers: [{
        id: "foot-left-binding",
        role: "FOOT_PLANT",
        locator_uuid: "locator-a",
        evidence_ref: "user:explicit-foot-choice",
      }],
    });
    expect(JSON.stringify(result)).not.toContain("world_position");
    expect(JSON.stringify(input)).toBe(before);
  });

  test("nonzero time offsets and nondivisible intervals include both endpoints", () => {
    const result = prepareContactSamplingPlan({
      ...request(), window: { start: 1.5, end: 2.5, max_gap_seconds: 0.4 },
    });
    expect(result.state).toBe("PREPARED_SOURCE_ONLY");
    expect(result.sample_times).toHaveLength(4);
    expect(result.sample_times[0]).toBe(1.5);
    expect(result.sample_times.at(-1)).toBe(2.5);
    for (let i = 1; i < result.sample_times.length; i++) {
      expect(result.sample_times[i]! - result.sample_times[i - 1]!)
        .toBeLessThanOrEqual(0.4 + 1e-9);
    }
  });

  test("nominal 30 fps four-second window fits the bounded 121-frame budget", () => {
    const result = prepareContactSamplingPlan({
      ...request(), window: { start: 0, end: 4, max_gap_seconds: 1 / 30 },
    });
    expect(result.state).toBe("PREPARED_SOURCE_ONLY");
    expect(result.sample_times).toHaveLength(CONTACT_SAMPLING_MAX_FRAMES);
    expect(result.sample_times.at(-1)).toBe(4);
  });

  test("a requested 240-frame timeline is rejected, not silently downsampled", () => {
    const result = prepareContactSamplingPlan({
      ...request(), duration_seconds: 8,
      window: { start: 0, end: 8, max_gap_seconds: 1 / 30 },
    });
    expect(result).toMatchObject({
      state: "UNVERIFIED",
      reason: "CONTACT_SAMPLING_FRAME_BUDGET_EXCEEDED",
      native_sampling_state: "NOT_EXECUTED",
      sample_count: 0, sample_times: [], markers: [],
    });
  });

  test("nonfinite, reversed and too-small timing windows fail closed", () => {
    for (const window of [
      { start: -1, end: 1, max_gap_seconds: 0.25 },
      { start: 1, end: 1, max_gap_seconds: 0.25 },
      { start: 1, end: 0, max_gap_seconds: 0.25 },
      { start: 0, end: Number.NaN, max_gap_seconds: 0.25 },
      { start: 0, end: 121, max_gap_seconds: 1 },
      { start: 0, end: 1, max_gap_seconds: 1e-6 },
      { start: 0, end: 1, max_gap_seconds: Infinity },
    ]) {
      expect(prepareContactSamplingPlan({ ...request(), window })).toMatchObject({
        state: "UNVERIFIED", reason: "CONTACT_SAMPLING_WINDOW_INVALID",
      });
    }
  });

  test("time window cannot exceed the authored native clip duration", () => {
    const result = prepareContactSamplingPlan({
      ...request(),
      duration_seconds: 2,
      window: { start: 0, end: 2.1, max_gap_seconds: 0.25 },
    });
    expect(result).toMatchObject({
      state: "UNVERIFIED",
      reason: "CONTACT_SAMPLING_OUTSIDE_ANIMATION",
      sample_times: [],
      native_sampling_state: "NOT_EXECUTED",
    });
  });

  test("nonfinite or invalid authored animation duration cannot authorize sampling", () => {
    for (const duration_seconds of [0, -1, NaN, Infinity, 121]) {
      const result = prepareContactSamplingPlan({
        ...request(), duration_seconds,
      });
      expect(result).toMatchObject({
        state: "UNVERIFIED", reason: "AUTHORED_ANIMATION_DURATION_INVALID",
      });
    }
  });

  test("a stale project/animation/bone or unknown Locator cannot authorize a sampling plan", () => {
    for (const change of [
      { project_uuid: "stale-project" },
      { animation_uuid: "stale-animation" },
      { group_uuid: "stale-group" },
      { locator_uuid: "stale-locator" },
    ]) {
      expect(prepareContactSamplingPlan({
        ...request(), bindings: [role(change)],
      })).toMatchObject({
        state: "UNVERIFIED",
        reason: "CONTACT_MARKERS_NOT_FULLY_LINKED",
        markers: [], sample_times: [],
      });
    }
  });

  test("partial contact role binding blocks the whole schedule", () => {
    const result = prepareContactSamplingPlan({
      ...request(),
      bindings: [
        role(),
        role({ id: "second", locator_uuid: "missing", role: "HAND_GRIP" }),
      ],
    });
    expect(result.state).toBe("UNVERIFIED");
    expect(result.reason).toBe("CONTACT_MARKERS_NOT_FULLY_LINKED");
    expect(result.sample_times).toEqual([]);
  });

  test("unverified active preview or forged frame synchronization never schedules", () => {
    for (const change of [
      { state: "UNVERIFIED" as const },
      { frame_pose_synchronized: true },
      { native_animation_sampling_performed: true },
    ]) {
      const result = prepareContactSamplingPlan({
        ...request(),
        snapshot: { ...pose(), ...change } as ContactMarkerPoseSnapshot,
      });
      expect(result).toMatchObject({
        state: "UNVERIFIED", reason: "CONTACT_MARKERS_NOT_FULLY_LINKED",
      });
    }
  });

  test("plan retains both declared target roles without copying snapshot pixels or positions", () => {
    const result = prepareContactSamplingPlan({
      ...request(),
      bindings: [
        role(),
        role({
          id: "hand-contact",
          role: "HAND_GRIP",
          locator_uuid: "locator-b",
          intent_authority: "DECLARED_REFERENCE_INTENT",
          evidence_ref: "reference:approved-grip",
        }),
      ],
    });
    expect(result.state).toBe("PREPARED_SOURCE_ONLY");
    expect(result.markers.map((item) => [item.role, item.locator_uuid]))
      .toEqual([["FOOT_PLANT", "locator-a"], ["HAND_GRIP", "locator-b"]]);
    expect(result.markers[1]).toMatchObject({
      intent_authority: "DECLARED_REFERENCE_INTENT",
      evidence_ref: "reference:approved-grip",
    });
    expect(JSON.stringify(result)).not.toContain("world_position");
    expect(result.native_sampling_state).toBe("NOT_EXECUTED");
  });
});
