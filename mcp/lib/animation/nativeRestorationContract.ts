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
export function describeNativeAnimationRestorationBoundary(plan: SamplingPlanBoundary) {
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
  };
}
