/// <reference types="three" />
/// <reference types="blockbench-types" />

/**
 * Reads the native world position of a selected bone's existing preview
 * origin. It does not change Timeline.time, re-evaluate animations, invoke
 * Animator.preview, move a bone, or claim an end-effector contact point.
 */
export function readCurrentBonePoseSnapshot(animation: _Animation, group: Group) {
  const unverified = (reason: string) => ({
    state: "UNVERIFIED" as const,
    reason,
    source: "CURRENT_EDITOR_PREVIEW_ONLY" as const,
    frame_pose_synchronized: false as const,
    contact_marker_attested: false as const,
    native_animation_sampling_performed: false as const,
    visual_verdict: "NOT_EVALUATED" as const,
  });

  if (typeof Project === "undefined" || !Project?.uuid ||
      typeof AnimationItem === "undefined" ||
      typeof Group === "undefined" ||
      typeof Timeline === "undefined" ||
      typeof Animator === "undefined" ||
      typeof Modes === "undefined" ||
      typeof Canvas === "undefined" ||
      typeof THREE === "undefined") {
    return unverified("NATIVE_PREVIEW_RUNTIME_UNAVAILABLE");
  }
  // The inspected animation is not necessarily the currently displayed one.
  // A passive snapshot is only meaningful for the selected, paused clip.
  if (!Array.isArray(AnimationItem.all) ||
      AnimationItem.selected !== animation ||
      !AnimationItem.all.includes(animation) ||
      !Animator.open || Modes.animate !== true || animation.playing !== true) {
    return unverified("INSPECTED_ANIMATION_NOT_ACTIVE_PREVIEW");
  }
  if (Timeline.playing) return unverified("TIMELINE_PLAYING");
  if (!Number.isFinite(Timeline.time) || Timeline.time < 0 ||
      !Number.isFinite(animation.length) || Timeline.time > animation.length) {
    return unverified("TIMELINE_TIME_INVALID");
  }
  if (AnimationItem.all.some((item) =>
    item !== animation && item.playing === true
  )) {
    return unverified("MULTIPLE_ANIMATIONS_PLAYING");
  }
  if (!Array.isArray(Group.all) || !Group.all.includes(group) ||
      !group.uuid || group.visibility === false) {
    return unverified("GROUP_IDENTITY_OR_VISIBILITY_UNAVAILABLE");
  }
  const mesh = group.mesh;
  if (!mesh || typeof mesh.updateWorldMatrix !== "function" ||
      typeof mesh.getWorldPosition !== "function") {
    return unverified("NATIVE_GROUP_WORLD_MATRIX_UNAVAILABLE");
  }
  let node: THREE.Object3D | null = mesh;
  let attached = false;
  while (node) {
    if (node.visible === false) return unverified("GROUP_SCENE_HIDDEN");
    if (node === Canvas.scene) { attached = true; break; }
    node = node.parent;
  }
  if (!attached) return unverified("GROUP_OUTSIDE_ACTIVE_SCENE");

  try {
    // Updates Three.js transient transform caches, not authored geometry or
    // animation keyframes. Never interpret this as reevaluating Timeline.time.
    mesh.updateWorldMatrix(true, false);
    const position = mesh.getWorldPosition(new THREE.Vector3());
    const world = [position.x, position.y, position.z];
    if (world.some((value) => !Number.isFinite(value))) {
      return unverified("NATIVE_GROUP_WORLD_POSITION_INVALID");
    }
    return {
      state: "OBSERVED" as const,
      reason: null,
      source: "CURRENT_EDITOR_PREVIEW_ONLY" as const,
      project_uuid: Project.uuid,
      animation_uuid: animation.uuid,
      group_uuid: group.uuid,
      timeline_time_observed: Timeline.time,
      bone_origin_world: world as [number, number, number],
      frame_pose_synchronized: false as const,
      contact_marker_attested: false as const,
      native_animation_sampling_performed: false as const,
      visual_verdict: "NOT_EVALUATED" as const,
      interpretation:
        "One displayed native bone origin, not an end effector, floor contact, " +
        "interpolated frame sequence, or verified animation time/pose correspondence.",
    };
  } catch {
    return unverified("NATIVE_GROUP_POSE_READ_FAILED");
  }
}
