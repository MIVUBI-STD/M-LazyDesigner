/**
 * Non-mutating Blockbench animation recovery requirements.
 *
 * Upstream Blockbench Animator.preview() is not a pure pose evaluator:
 * it can reset and stack transforms, drive controller time, play effects,
 * change preview textures/frames/scale/ground, rebuild overlays and dispatch
 * events to unknown listeners. Restoring Timeline.time alone is insufficient.
 *
 * This is a dependency checklist consumed by the existing contact sampling
 * preflight. It is NOT a second renderer, state manager, sampler or authority
 * to run Animator.preview(). No caller-provided assertions can mark it ready.
 */
export const NATIVE_ANIMATION_RESTORE_REQUIREMENTS = [
  {
    id: "TIMELINE_CLOCK_AND_PLAYBACK",
    owner: "Timeline.time/playing",
    proof_required: "Exact time, paused/playing state and audio queues are unchanged after every failure path.",
  },
  {
    id: "ANIMATION_AND_CONTROLLER_SELECTION",
    owner: "AnimationItem/AnimationController",
    proof_required: "Selected clips, playing flags, controller state, transitions and blends are preserved.",
  },
  {
    id: "BONE_LOCATOR_POSE_AND_MESH",
    owner: "Group/Locator/Mesh.scene_object",
    proof_required: "All affected hierarchy world/local transforms and deformed mesh geometry match their pre-capture state.",
  },
  {
    id: "MOLANG_AND_PREVIEW_VARIABLES",
    owner: "Animator.MolangParser/Project.variable_placeholders",
    proof_required: "Parser variables, expression side effects and preview variable state are isolated and restored.",
  },
  {
    id: "TEXTURE_SELECTION_AND_FRAMES",
    owner: "Texture/TextureAnimator",
    proof_required: "Selected texture, currentFrame and texture animation display state remain identical.",
  },
  {
    id: "MODEL_SCALE_AND_SCENE_OFFSETS",
    owner: "Project.model_3d/Canvas.ground_plane/three_grid",
    proof_required: "Model scale, ground-plane and grid offsets are recovered even when preview throws.",
  },
  {
    id: "PARTICLES_AND_SOUNDS",
    owner: "EffectAnimator/WinterskyScene/Timeline audio",
    proof_required: "Emitters, sound playback and active/paused audio queues cannot escape an isolated evaluation.",
  },
  {
    id: "OVERLAYS_AND_DEFORMED_GEOMETRY",
    owner: "Animator.onion_skin_object/motion_trail/Mesh",
    proof_required: "Onion-skin, trails, billboard and mesh-deformation display changes are not leaked.",
  },
  {
    id: "EDITOR_SELECTION_AND_UI",
    owner: "Transformer/Interface/Outliner",
    proof_required: "Element, bone, texture and timeline UI selection and transform gizmo state remain unchanged.",
  },
  {
    id: "FRAME_EVENTS_AND_EXTENSIONS",
    owner: "Blockbench.dispatchEvent/display_animation_frame",
    proof_required: "Unknown external listeners cannot mutate durable authored or UI state during sample evaluation.",
  },
] as const;

export type NativeRestorationRequirementId =
  (typeof NATIVE_ANIMATION_RESTORE_REQUIREMENTS)[number]["id"];

type SamplingPlanBoundary = {
  state?: string;
  native_sampling_state?: string;
  sampling_authority?: string;
  sample_count?: number;
};

/**
 * A strict refusal gate: static source review never supplies runtime proof.
 * In a future native harness, measured before/after recovery for all required
 * surfaces must be an independently validated execution context, not a
 * self-declared input to this function.
 */
export function describeNativeAnimationRestorationBoundary(
  plan: SamplingPlanBoundary,
  snapshots?: NativeRestorationSnapshotPair
) {
  const planPrepared = plan?.state === "PREPARED_SOURCE_ONLY" &&
    plan?.native_sampling_state === "NOT_EXECUTED" &&
    plan?.sampling_authority === "NO_RUNTIME_SAMPLING_AUTHORIZED" &&
    plan?.sample_count === 0;

  return {
    state: "BLOCKED_NATIVE_VERIFICATION" as const,
    reason: planPrepared
      ? ("FULL_PREVIEW_RESTORATION_NOT_ATTESTED" as const)
      : ("SAMPLING_PLAN_NOT_PREPARED" as const),
    checked_source_plan: planPrepared,
    native_sampler_enabled: false as const,
    live_blockbench_restore_executed: false as const,
    all_state_surfaces_restored: false as const,
    visual_verdict: "NOT_EVALUATED" as const,
    required_surface_count: NATIVE_ANIMATION_RESTORE_REQUIREMENTS.length,
    unresolved_surfaces: NATIVE_ANIMATION_RESTORE_REQUIREMENTS.map((entry) => ({
      id: entry.id,
      owner: entry.owner,
      proof_required: entry.proof_required,
      native_proof: "NOT_EXECUTED" as const,
    })),
    next_acceptable_proof:
      "A dedicated installed Blockbench state-isolated pose evaluator must " +
      "prove all required before/after surfaces and failure paths. " +
      "A Timeline-only rewind, source assertions, or mock tests cannot enable sampling.",
    ...(snapshots === undefined ? {} : {
      supplied_state_comparison: compareNativeAnimationRestoreSnapshots(snapshots),
    }),
  };
}


/**
 * Caller-supplied digests of selected restoration surfaces, not proof that
 * those bytes were read from a live Blockbench editor or fully cover a surface.
 * A native test harness must independently attest acquisition/provenance.
 */
export type NativeRestorationStateSnapshot = {
  project_uuid: string;
  animation_uuid: string;
  evaluation_id: string;
  surfaces: readonly {
    id: NativeRestorationRequirementId;
    sha256: string;
  }[];
};

export type NativeRestorationSnapshotPair = {
  before: NativeRestorationStateSnapshot;
  after: NativeRestorationStateSnapshot;
};

const NATIVE_RESTORE_SHA256 = /^[a-f0-9]{64}$/;
const NATIVE_RESTORE_ID_MAX = 160;

/**
 * Deterministic before/after comparison for the SAME declared context.
 * Never certifies native recovery: a matching hash can be fabricated or
 * generated from incomplete/incorrect measurements. It is diagnostic only.
 */
export function compareNativeAnimationRestoreSnapshots(
  pair: NativeRestorationSnapshotPair
) {
  const base = {
    proof_scope: "CALLER_SUPPLIED_DIGEST_COMPARISON_ONLY" as const,
    restoration_accepted: false as const,
    native_editor_attested: false as const,
    native_sampler_enabled: false as const,
    visual_verdict: "NOT_EVALUATED" as const,
  };
  const unavailable = (reason: string) => ({
    ...base,
    state: "UNVERIFIED" as const,
    reason,
    matched_count: 0,
    changed_count: 0,
    missing_count: NATIVE_ANIMATION_RESTORE_REQUIREMENTS.length,
    surfaces: [] as Array<{
      id: NativeRestorationRequirementId;
      status: "MATCHED" | "CHANGED" | "MISSING";
    }>,
  });
  if (!pair || !pair.before || !pair.after) {
    return unavailable("RESTORE_SNAPSHOT_PAIR_MISSING");
  }

  const validIdentity = (value: unknown): value is string =>
    typeof value === "string" && value.length > 0 &&
    value.length <= NATIVE_RESTORE_ID_MAX &&
    value.trim() === value;

  const { before, after } = pair;
  const contexts = [before, after];
  if (contexts.some((entry) =>
    !validIdentity(entry.project_uuid) ||
    !validIdentity(entry.animation_uuid) ||
    !validIdentity(entry.evaluation_id)
  )) return unavailable("RESTORE_SNAPSHOT_IDENTITY_INVALID");
  if (before.project_uuid !== after.project_uuid ||
      before.animation_uuid !== after.animation_uuid ||
      before.evaluation_id !== after.evaluation_id) {
    return unavailable("RESTORE_SNAPSHOT_CONTEXT_MISMATCH");
  }

  const required = new Set<string>(
    NATIVE_ANIMATION_RESTORE_REQUIREMENTS.map((entry) => entry.id)
  );
  const readMap = (input: NativeRestorationStateSnapshot) => {
    if (!Array.isArray(input.surfaces) ||
        input.surfaces.length > NATIVE_ANIMATION_RESTORE_REQUIREMENTS.length) {
      return null;
    }
    const entries = new Map<NativeRestorationRequirementId, string>();
    for (const row of input.surfaces) {
      if (!row || !required.has(row.id) ||
          typeof row.sha256 !== "string" ||
          !NATIVE_RESTORE_SHA256.test(row.sha256) ||
          entries.has(row.id)) return null;
      entries.set(row.id, row.sha256);
    }
    return entries;
  };
  const left = readMap(before);
  const right = readMap(after);
  if (!left || !right) {
    return unavailable("RESTORE_SNAPSHOT_SURFACES_INVALID");
  }

  // Always report all required surfaces in canonical order, including
  // omissions. Missing evidence must not be counted as matching recovery.
  const surfaces = NATIVE_ANIMATION_RESTORE_REQUIREMENTS.map((item) => {
    const a = left.get(item.id), b = right.get(item.id);
    return {
      id: item.id,
      status: (a === undefined || b === undefined
        ? "MISSING" : a === b ? "MATCHED" : "CHANGED") as
          "MATCHED" | "CHANGED" | "MISSING",
    };
  });
  const matched = surfaces.filter((item) => item.status === "MATCHED").length;
  const changed = surfaces.filter((item) => item.status === "CHANGED").length;
  const missing = surfaces.filter((item) => item.status === "MISSING").length;
  return {
    ...base,
    state: "DIAGNOSTIC_ONLY" as const,
    reason: changed > 0 ? ("RESTORATION_DIGEST_DIFFERENCES" as const) :
      missing > 0 ? ("RESTORATION_COVERAGE_INCOMPLETE" as const) :
        ("SUPPLIED_DIGESTS_MATCH" as const),
    project_uuid: before.project_uuid,
    animation_uuid: before.animation_uuid,
    evaluation_id: before.evaluation_id,
    matched_count: matched,
    changed_count: changed,
    missing_count: missing,
    surfaces,
    interpretation:
      "Reported equality does not attest source completeness, native sampling " +
      "or restoration. All state surfaces need independently verified live " +
      "capture, including external callback effects.",
  };
}
