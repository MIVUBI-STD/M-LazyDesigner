import { describe, expect, test } from "bun:test";
import {
  NATIVE_ANIMATION_RESTORE_REQUIREMENTS,
  compareNativeAnimationRestoreSnapshots,
  describeNativeAnimationRestorationBoundary,
  type NativeRestorationStateSnapshot,
} from "@/lib/animation/nativeRestorationContract";

function snapshot(): NativeRestorationStateSnapshot {
  return {
    project_uuid: "project-a",
    animation_uuid: "animation-a",
    evaluation_id: "isolated-evaluation-1",
    surfaces: NATIVE_ANIMATION_RESTORE_REQUIREMENTS.map((entry, index) => ({
      id: entry.id,
      sha256: index.toString(16).padStart(64, "0"),
    })),
  };
}

describe("native restoration before/after digest diagnostics", () => {
  test("all ten matching supplied digests remain diagnostic, not native acceptance", () => {
    const before = snapshot(), after = snapshot();
    const result = compareNativeAnimationRestoreSnapshots({ before, after });
    expect(result).toMatchObject({
      state: "DIAGNOSTIC_ONLY",
      reason: "SUPPLIED_DIGESTS_MATCH",
      matched_count: 10, changed_count: 0, missing_count: 0,
      restoration_accepted: false,
      native_editor_attested: false,
      native_sampler_enabled: false,
      visual_verdict: "NOT_EVALUATED",
    });
    expect(result.surfaces.map((entry) => entry.status))
      .toEqual(Array(10).fill("MATCHED"));
  });

  test("one changed texture digest is identified by exact canonical surface ID", () => {
    const before = snapshot(), after = snapshot();
    after.surfaces = after.surfaces.map((entry) => entry.id === "TEXTURE_SELECTION_AND_FRAMES"
      ? { ...entry, sha256: "f".repeat(64) } : entry);
    const result = compareNativeAnimationRestoreSnapshots({ before, after });
    expect(result).toMatchObject({
      state: "DIAGNOSTIC_ONLY",
      reason: "RESTORATION_DIGEST_DIFFERENCES",
      matched_count: 9, changed_count: 1, missing_count: 0,
      restoration_accepted: false,
    });
    expect(result.surfaces.find((entry) => entry.id === "TEXTURE_SELECTION_AND_FRAMES")?.status)
      .toBe("CHANGED");
  });

  test("missing evidence is never interpreted as restored native state", () => {
    const before = snapshot(), after = snapshot();
    after.surfaces = after.surfaces.slice(0, 8);
    const result = compareNativeAnimationRestoreSnapshots({ before, after });
    expect(result).toMatchObject({
      reason: "RESTORATION_COVERAGE_INCOMPLETE",
      matched_count: 8, changed_count: 0, missing_count: 2,
      restoration_accepted: false,
    });
    expect(result.surfaces.filter((entry) => entry.status === "MISSING")).toHaveLength(2);
  });

  test("reported differences take priority over other missing surface evidence", () => {
    const before = snapshot(), after = snapshot();
    after.surfaces = [
      { ...after.surfaces[0]!, sha256: "a".repeat(64) },
      ...after.surfaces.slice(1, 4),
    ];
    const result = compareNativeAnimationRestoreSnapshots({ before, after });
    expect(result).toMatchObject({
      reason: "RESTORATION_DIGEST_DIFFERENCES",
      matched_count: 3, changed_count: 1, missing_count: 6,
    });
  });

  test("unrelated projects, animations or evaluation sessions cannot be paired", () => {
    const before = snapshot();
    for (const override of [
      { project_uuid: "another-project" },
      { animation_uuid: "another-animation" },
      { evaluation_id: "another-evaluation" },
    ]) {
      expect(compareNativeAnimationRestoreSnapshots({
        before, after: { ...snapshot(), ...override },
      })).toMatchObject({
        state: "UNVERIFIED",
        reason: "RESTORE_SNAPSHOT_CONTEXT_MISMATCH",
        restoration_accepted: false,
        surfaces: [],
      });
    }
  });

  test("duplicate/unknown domain ID and malformed digest are rejected", () => {
    const before = snapshot();
    const bad = [
      { ...snapshot(), surfaces: [...snapshot().surfaces, snapshot().surfaces[0]!] },
      { ...snapshot(), surfaces: [{ id: "UNKNOWN_STATE" as any, sha256: "0".repeat(64) }] },
      { ...snapshot(), surfaces: [{ id: "PARTICLES_AND_SOUNDS" as const, sha256: "not-a-hash" }] },
      { ...snapshot(), surfaces: [{ id: "PARTICLES_AND_SOUNDS" as const, sha256: "A".repeat(64) }] },
      { ...snapshot(), surfaces: Array(11).fill(snapshot().surfaces[0]) },
    ];
    for (const after of bad) {
      expect(compareNativeAnimationRestoreSnapshots({ before, after })).toMatchObject({
        state: "UNVERIFIED", reason: "RESTORE_SNAPSHOT_SURFACES_INVALID",
      });
    }
  });

  test("empty snapshots enumerate all ten missing surfaces with no native authority", () => {
    const before = { ...snapshot(), surfaces: [] };
    const after = { ...snapshot(), surfaces: [] };
    const result = compareNativeAnimationRestoreSnapshots({ before, after });
    expect(result).toMatchObject({
      state: "DIAGNOSTIC_ONLY", reason: "RESTORATION_COVERAGE_INCOMPLETE",
      matched_count: 0, changed_count: 0, missing_count: 10,
      native_editor_attested: false,
    });
    expect(result.surfaces).toHaveLength(10);
  });

  test("before/after comparison preserves caller objects and stable canonical order", () => {
    const before = snapshot(), after = snapshot();
    const original = JSON.stringify({ before, after });
    const first = compareNativeAnimationRestoreSnapshots({ before, after });
    const second = compareNativeAnimationRestoreSnapshots({ before, after });
    expect(first).toEqual(second);
    expect(JSON.stringify({ before, after })).toBe(original);
    expect(first.surfaces.map((entry) => entry.id))
      .toEqual(NATIVE_ANIMATION_RESTORE_REQUIREMENTS.map((entry) => entry.id));
  });

  test("existing refusal gate exposes optional diagnostics but cannot be unlocked by them", () => {
    const validPlan = {
      state: "PREPARED_SOURCE_ONLY",
      native_sampling_state: "NOT_EXECUTED",
      sampling_authority: "NO_RUNTIME_SAMPLING_AUTHORIZED",
      sample_count: 0,
    };
    const baseline = describeNativeAnimationRestorationBoundary(validPlan);
    expect(baseline).not.toHaveProperty("supplied_state_comparison");
    const withSnapshots = describeNativeAnimationRestorationBoundary(
      validPlan, { before: snapshot(), after: snapshot() }
    );
    expect(withSnapshots).toMatchObject({
      state: "BLOCKED_NATIVE_VERIFICATION",
      native_sampler_enabled: false,
      all_state_surfaces_restored: false,
      live_blockbench_restore_executed: false,
      supplied_state_comparison: {
        state: "DIAGNOSTIC_ONLY",
        reason: "SUPPLIED_DIGESTS_MATCH",
        restoration_accepted: false,
      },
    });
  });
});
