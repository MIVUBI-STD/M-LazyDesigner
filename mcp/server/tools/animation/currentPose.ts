/// <reference types="three" />
/// <reference types="blockbench-types" />

export const CURRENT_POSE_LOCATOR_LIMIT = 16;

/**
 * Enumerates only native Locators directly owned by the inspected Group.
 * Marker purpose is deliberately UNASSIGNED: an attached Locator is not
 * automatically a planted foot, grip, impact target, or end effector.
 */
function readDirectLocatorCandidates(group: Group) {
  const scope = "DIRECT_CHILD_NATIVE_LOCATORS_ONLY" as const;
  const role = "UNASSIGNED_CONTACT_INTENT" as const;
  const unavailable = (reason: string) => ({
    state: "UNVERIFIED" as const,
    reason,
    scope,
    role,
    count: null,
    observed_count: 0,
    candidates: [],
    native_timeline_sampling_performed: false as const,
  });
  if (typeof Locator === "undefined" || !Array.isArray(Locator.all)) {
    return unavailable("NATIVE_LOCATOR_LIST_UNAVAILABLE");
  }
  if (!Array.isArray(group.children)) {
    return unavailable("NATIVE_GROUP_CHILDREN_UNAVAILABLE");
  }
  const direct = Locator.all.filter((locator) => locator.parent === group);
  if (direct.length > CURRENT_POSE_LOCATOR_LIMIT) {
    return unavailable("NATIVE_LOCATOR_EVIDENCE_LIMIT_EXCEEDED");
  }
  const identities = new Set<string>();
  for (const locator of direct) {
    if (typeof locator.uuid !== "string" || !locator.uuid.trim() ||
        identities.has(locator.uuid)) {
      return unavailable("AMBIGUOUS_NATIVE_LOCATOR_IDENTITY");
    }
    identities.add(locator.uuid);
  }

  const candidates = direct.map((locator) => {
    const identity = {
      uuid: locator.uuid,
      name: typeof locator.name === "string" ? locator.name : null,
    };
    const unavailableLocator = (reason: string) => ({
      ...identity,
      state: "UNVERIFIED" as const,
      reason,
      world_position: null,
    });
    if (!group.children.includes(locator)) {
      return unavailableLocator("LOCATOR_PARENT_CHILD_MISMATCH");
    }
    if (locator.visibility === false) {
      return unavailableLocator("LOCATOR_HIDDEN");
    }
    const mesh = locator.mesh;
    if (!mesh || typeof mesh.updateWorldMatrix !== "function" ||
        typeof mesh.getWorldPosition !== "function") {
      return unavailableLocator("NATIVE_LOCATOR_MESH_UNAVAILABLE");
    }
    let node: THREE.Object3D | null = mesh;
    let encounteredParent = false;
    let encounteredScene = false;
    while (node) {
      if (node.visible === false) {
        return unavailableLocator("LOCATOR_SCENE_HIDDEN");
      }
      if (node === group.mesh) encounteredParent = true;
      if (node === Canvas.scene) {
        encounteredScene = true;
        break;
      }
      node = node.parent;
    }
    if (!encounteredParent || !encounteredScene) {
      return unavailableLocator("LOCATOR_WORLD_HIERARCHY_UNVERIFIED");
    }
    try {
      mesh.updateWorldMatrix(true, false);
      const position = mesh.getWorldPosition(new THREE.Vector3());
      const world = [position.x, position.y, position.z];
      if (world.some((value) => !Number.isFinite(value))) {
        return unavailableLocator("LOCATOR_WORLD_POSITION_INVALID");
      }
      return {
        ...identity,
        state: "OBSERVED" as const,
        reason: null,
        world_position: world as [number, number, number],
      };
    } catch {
      return unavailableLocator("LOCATOR_WORLD_READ_FAILED");
    }
  }).sort((a, b) => a.uuid.localeCompare(b.uuid));

  const observed = candidates.filter((item) => item.state === "OBSERVED").length;
  return {
    state: direct.length === 0
      ? ("NONE" as const)
      : observed === direct.length
        ? ("AVAILABLE" as const) : ("PARTIAL" as const),
    reason: null,
    scope,
    role,
    count: direct.length,
    observed_count: observed,
    candidates,
    native_timeline_sampling_performed: false as const,
  };
}

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
      locator_candidates: readDirectLocatorCandidates(group),
      frame_pose_synchronized: false as const,
      contact_marker_attested: false as const,
      native_animation_sampling_performed: false as const,
      visual_verdict: "NOT_EVALUATED" as const,
      interpretation:
        "Current native bone origin and directly attached Locator candidates only; " +
        "Locator role is unassigned and neither these positions nor the displayed " +
        "time certify an end effector, physical contact, or animation frame sequence.",
    };
  } catch {
    return unverified("NATIVE_GROUP_POSE_READ_FAILED");
  }
}
