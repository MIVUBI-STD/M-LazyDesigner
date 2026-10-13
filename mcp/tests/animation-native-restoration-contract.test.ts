import { describe, expect, test } from "bun:test";
import {
  describeNativeAnimationRestorationBoundary,
  NATIVE_ANIMATION_RESTORE_REQUIREMENTS,
} from "@/lib/animation/nativeRestorationContract";
import { prepareContactSamplingPlan } from "@/lib/animation/contactMarkerBinding";

const validPlan = {
  state: "PREPARED_SOURCE_ONLY",
  native_sampling_state: "NOT_EXECUTED",
  sampling_authority: "NO_RUNTIME_SAMPLING_AUTHORIZED",
  sample_count: 0,
} as const;

describe("native animation restoration boundary", () => {
  test("enumerates distinct required restore owners rather than accepting Timeline-only rewind", () => {
    const ids = NATIVE_ANIMATION_RESTORE_REQUIREMENTS.map((entry) => entry.id);
    expect(ids.length).toBe(10);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("TIMELINE_CLOCK_AND_PLAYBACK");
    expect(ids).toContain("ANIMATION_AND_CONTROLLER_SELECTION");
    expect(ids).toContain("BONE_LOCATOR_POSE_AND_MESH");
    expect(ids).toContain("TEXTURE_SELECTION_AND_FRAMES");
    expect(ids).toContain("PARTICLES_AND_SOUNDS");
    expect(ids).toContain("FRAME_EVENTS_AND_EXTENSIONS");
    expect(NATIVE_ANIMATION_RESTORE_REQUIREMENTS.every((entry) =>
      entry.owner.length > 0 && entry.proof_required.length > 0
    )).toBe(true);
  });

  test("even a valid plan cannot authorize native sampling", () => {
    const result = describeNativeAnimationRestorationBoundary(validPlan);
    expect(result).toMatchObject({
      state: "BLOCKED_NATIVE_VERIFICATION",
      reason: "FULL_PREVIEW_RESTORATION_NOT_ATTESTED",
      checked_source_plan: true,
      native_sampler_enabled: false,
      live_blockbench_restore_executed: false,
      all_state_surfaces_restored: false,
      visual_verdict: "NOT_EVALUATED",
      required_surface_count: 10,
    });
    expect(result.unresolved_surfaces).toHaveLength(10);
    expect(result.unresolved_surfaces.every((item) =>
      item.native_proof === "NOT_EXECUTED"
    )).toBe(true);
  });

  test("incomplete, fake-executed or rejected plans cannot advance recovery authority", () => {
    for (const plan of [
      {},
      { ...validPlan, state: "UNVERIFIED" },
      { ...validPlan, native_sampling_state: "EXECUTED" },
      { ...validPlan, sampling_authority: "LIVE_APPROVED" },
      { ...validPlan, sample_count: 2 },
      { ...validPlan, sample_count: Number.NaN },
    ]) {
      expect(describeNativeAnimationRestorationBoundary(plan)).toMatchObject({
        state: "BLOCKED_NATIVE_VERIFICATION",
        reason: "SAMPLING_PLAN_NOT_PREPARED",
        checked_source_plan: false,
        native_sampler_enabled: false,
        live_blockbench_restore_executed: false,
      });
    }
  });

  test("caller-declared fake native acceptance never changes a static boundary", () => {
    const forged = {
      ...validPlan,
      all_state_surfaces_restored: true,
      preview_restoration_verified: true,
      live_blockbench_restore_executed: true,
      visual_verdict: "PASS",
      native_sampler_enabled: true,
      restoration_receipt: "claimed-native-proof",
    };
    const result = describeNativeAnimationRestorationBoundary(forged);
    expect(result).toMatchObject({
      state: "BLOCKED_NATIVE_VERIFICATION",
      checked_source_plan: true,
      native_sampler_enabled: false,
      live_blockbench_restore_executed: false,
      all_state_surfaces_restored: false,
      visual_verdict: "NOT_EVALUATED",
    });
    expect(result.unresolved_surfaces).toHaveLength(10);
  });

  test("static checklist owns explicit failure-path verification for every native effect", () => {
    const result = describeNativeAnimationRestorationBoundary(validPlan);
    const surfaces = result.unresolved_surfaces;
    expect(surfaces.find((entry) => entry.id === "FRAME_EVENTS_AND_EXTENSIONS")?.proof_required)
      .toContain("Unknown external listeners");
    expect(surfaces.find((entry) => entry.id === "TIMELINE_CLOCK_AND_PLAYBACK")?.proof_required)
      .toContain("after every failure path");
    expect(result.next_acceptable_proof).toContain("before/after");
    expect(result.next_acceptable_proof).toContain("Timeline-only rewind");
  });

  test("contracts remain deterministic and without caller-object mutation", () => {
    const input = { ...validPlan };
    const frozen = JSON.stringify(input);
    const a = describeNativeAnimationRestorationBoundary(input);
    const b = describeNativeAnimationRestorationBoundary(input);
    expect(a).toEqual(b);
    expect(JSON.stringify(input)).toBe(frozen);
  });

  test("existing contact sampler must consume recovery boundary without adding a new tool", async () => {
    const src = await Bun.file("lib/animation/contactMarkerBinding.ts").text();
    const native = await Bun.file("server/tools/animation/currentPose.ts").text();
    expect(src).toContain('from "./nativeRestorationContract"');
    expect(src).toContain("restoration_contract: describeNativeAnimationRestorationBoundary(");
    expect(native).toContain("sampling_preflight: prepareContactSamplingPlan({");
    expect(native).toContain("if (!sampling_window) return bound;");
    expect(native).not.toContain("Timeline.setTime(");
    expect(native).not.toContain("Animator.preview(");
  });
});
