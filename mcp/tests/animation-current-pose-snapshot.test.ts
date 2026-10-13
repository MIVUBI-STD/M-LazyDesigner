import { afterEach, describe, expect, test } from "bun:test";
import { readCurrentBonePoseSnapshot } from "@/server/tools/animation/currentPose";

const globals = globalThis as Record<string, any>;
const keys = ["Project", "AnimationItem", "Group", "Locator", "Timeline", "Animator", "Modes", "Canvas", "THREE"] as const;
const original = Object.fromEntries(keys.map((key) => [key, globals[key]]));
afterEach(() => { for (const key of keys) globals[key] = original[key]; });

function setup() {
  const root = { visible: true, parent: null };
  const events: string[] = [];
  const worldPosition = { x: 2, y: 5, z: -3 };
  const mesh: any = {
    visible: true, parent: root,
    updateWorldMatrix(updateParent: boolean, updateChildren: boolean) {
      events.push("world_matrix:" + updateParent + ":" + updateChildren);
    },
    getWorldPosition(output: any) {
      events.push("world_position");
      Object.assign(output, worldPosition);
      return output;
    },
  };
  const group = { uuid: "bone-uuid", visibility: true, mesh, children: [] as any[] };
  const animation = { uuid: "anim-uuid", length: 2, playing: true };
  let currentTime = 0.5;
  globals.Project = { uuid: "project-uuid" };
  globals.AnimationItem = { selected: animation, all: [animation] };
  globals.Group = { all: [group] };
  globals.Locator = { all: [] as any[] };
  globals.Timeline = {
    playing: false,
    get time() { return currentTime; },
    set time(value: number) { throw new Error("Timeline must remain unchanged: " + value); },
  };
  globals.Animator = { open: true };
  globals.Modes = { animate: true };
  globals.Canvas = { scene: root };
  globals.THREE = { Vector3: class { x = 0; y = 0; z = 0; } };
  return { group, animation, mesh, root, worldPosition, events, setTime: (value: number) => { currentTime = value; } };
}

function observedPose(animation: any, group: any) {
  const result = readCurrentBonePoseSnapshot(animation, group);
  if (result.state !== "OBSERVED") {
    throw new Error("Expected observed current pose but got " + result.reason);
  }
  return result;
}

describe("focused current-native-bone pose snapshot", () => {
  test("reads native world pivot with exact project/animation identity and no timeline changes", () => {
    const { group, animation, events } = setup();
    const result = observedPose(animation as any, group as any);
    expect(result).toMatchObject({
      state: "OBSERVED", source: "CURRENT_EDITOR_PREVIEW_ONLY",
      project_uuid: "project-uuid", animation_uuid: "anim-uuid",
      group_uuid: "bone-uuid", timeline_time_observed: 0.5,
      bone_origin_world: [2, 5, -3],
      frame_pose_synchronized: false, contact_marker_attested: false,
      native_animation_sampling_performed: false,
      visual_verdict: "NOT_EVALUATED",
    });
    expect(events).toEqual(["world_matrix:true:false", "world_position"]);
    expect(result.locator_candidates).toMatchObject({
      state: "NONE", scope: "DIRECT_CHILD_NATIVE_LOCATORS_ONLY",
      count: 0, observed_count: 0, role: "UNASSIGNED_CONTACT_INTENT", candidates: [],
    });
    expect(globals.Timeline.time).toBe(0.5);
  });

  test("different selected animation cannot be mistaken for sampled authored clip", () => {
    const { group, animation, events } = setup();
    globals.AnimationItem.selected = { uuid: "another-animation" };
    expect(readCurrentBonePoseSnapshot(animation as any, group as any))
      .toMatchObject({ state: "UNVERIFIED", reason: "INSPECTED_ANIMATION_NOT_ACTIVE_PREVIEW" });
    expect(events).toEqual([]);
  });

  test("live playing Timeline and multiple playing clips are not stable evidence", () => {
    const { group, animation, events } = setup();
    globals.Timeline.playing = true;
    expect(readCurrentBonePoseSnapshot(animation as any, group as any).reason).toBe("TIMELINE_PLAYING");
    globals.Timeline.playing = false;
    globals.AnimationItem.all.push({ uuid: "other", playing: true });
    expect(readCurrentBonePoseSnapshot(animation as any, group as any).reason).toBe("MULTIPLE_ANIMATIONS_PLAYING");
    expect(events).toEqual([]);
  });

  test("bone absent from active project and detached/hidden hierarchy fail closed", () => {
    const { group, animation, root, events } = setup();
    globals.Group.all = [];
    expect(readCurrentBonePoseSnapshot(animation as any, group as any).reason)
      .toBe("GROUP_IDENTITY_OR_VISIBILITY_UNAVAILABLE");
    globals.Group.all = [group];
    group.mesh.parent = { visible: true, parent: null };
    expect(readCurrentBonePoseSnapshot(animation as any, group as any).reason)
      .toBe("GROUP_OUTSIDE_ACTIVE_SCENE");
    group.mesh.parent = root;
    root.visible = false;
    expect(readCurrentBonePoseSnapshot(animation as any, group as any).reason).toBe("GROUP_SCENE_HIDDEN");
    expect(events).toEqual([]);
  });

  test("nonfinite time and out-of-range frames do not inherit current-pose authority", () => {
    const { group, animation, setTime, events } = setup();
    for (const time of [Number.NaN, -1, 2.001]) {
      setTime(time);
      expect(readCurrentBonePoseSnapshot(animation as any, group as any).reason).toBe("TIMELINE_TIME_INVALID");
    }
    expect(events).toEqual([]);
  });

  test("missing or invalid native mesh world coordinates are not reported as observed", () => {
    const { group, animation, worldPosition } = setup();
    group.mesh.getWorldPosition = undefined;
    expect(readCurrentBonePoseSnapshot(animation as any, group as any).reason)
      .toBe("NATIVE_GROUP_WORLD_MATRIX_UNAVAILABLE");
    group.mesh.getWorldPosition = (out: any) => Object.assign(out, worldPosition);
    worldPosition.x = Number.NaN;
    expect(readCurrentBonePoseSnapshot(animation as any, group as any).reason)
      .toBe("NATIVE_GROUP_WORLD_POSITION_INVALID");
    group.mesh.getWorldPosition = () => { throw new Error("GPU pose unavailable"); };
    expect(readCurrentBonePoseSnapshot(animation as any, group as any).reason)
      .toBe("NATIVE_GROUP_POSE_READ_FAILED");
  });

  test("selected but paused clip does not prove that its pose is displayed", () => {
    const { group, animation, events } = setup();
    animation.playing = false;
    expect(readCurrentBonePoseSnapshot(animation as any, group as any).reason)
      .toBe("INSPECTED_ANIMATION_NOT_ACTIVE_PREVIEW");
    expect(events).toEqual([]);
  });

  test("snapshot remains unavailable outside animation-mode preview", () => {
    const { group, animation } = setup();
    globals.Modes.animate = false;
    expect(readCurrentBonePoseSnapshot(animation as any, group as any).reason)
      .toBe("INSPECTED_ANIMATION_NOT_ACTIVE_PREVIEW");
    globals.Modes.animate = true;
    globals.Animator.open = false;
    expect(readCurrentBonePoseSnapshot(animation as any, group as any).reason)
      .toBe("INSPECTED_ANIMATION_NOT_ACTIVE_PREVIEW");
  });

  function locatorUnder(
    group: any, uuid: string, options: {
      visible?: boolean; parent?: any; position?: [number, number, number];
      sceneParent?: any;
    } = {}
  ) {
    const mesh = {
      visible: options.visible ?? true,
      parent: options.sceneParent ?? group.mesh,
      updateWorldMatrix(_p: boolean, _c: boolean) {},
      getWorldPosition(output: any) {
        const [x, y, z] = options.position ?? [1, 2, 3];
        Object.assign(output, { x, y, z });
        return output;
      },
    };
    const value = {
      uuid, name: uuid,
      parent: options.parent ?? group,
      visibility: options.visible ?? true,
      mesh,
    };
    group.children.push(value);
    globals.Locator.all.push(value);
    return value;
  }

  test("reports exact native child Locator world origins without assigning contact roles", () => {
    const { animation, group } = setup();
    locatorUnder(group, "hand-grip", { position: [3, 4, 5] });
    locatorUnder(group, "foot", { position: [1, 0, 2] });
    const result = observedPose(animation as any, group as any);
    expect(result.state).toBe("OBSERVED");
    expect(result.locator_candidates).toMatchObject({
      state: "AVAILABLE", count: 2, observed_count: 2,
      scope: "DIRECT_CHILD_NATIVE_LOCATORS_ONLY",
      role: "UNASSIGNED_CONTACT_INTENT",
      native_timeline_sampling_performed: false,
      candidates: [
        { uuid: "foot", name: "foot", state: "OBSERVED", world_position: [1, 0, 2] },
        { uuid: "hand-grip", name: "hand-grip", state: "OBSERVED", world_position: [3, 4, 5] },
      ],
    });
    expect(result.contact_marker_attested).toBe(false);
    expect(result.frame_pose_synchronized).toBe(false);
    expect(globals.Timeline.time).toBe(0.5);
  });

  test("hidden, parent-mismatched and detached Locators produce incomplete evidence", () => {
    const { animation, group } = setup();
    locatorUnder(group, "hidden", { visible: false });
    const mismatch = locatorUnder(group, "mismatch");
    group.children.splice(group.children.indexOf(mismatch), 1);
    locatorUnder(group, "detached", { sceneParent: { visible: true, parent: null } });
    const result = observedPose(animation as any, group as any);
    expect(result.locator_candidates).toMatchObject({
      state: "PARTIAL", observed_count: 0, count: 3,
      candidates: [
        { uuid: "detached", state: "UNVERIFIED", reason: "LOCATOR_WORLD_HIERARCHY_UNVERIFIED", world_position: null },
        { uuid: "hidden", state: "UNVERIFIED", reason: "LOCATOR_HIDDEN", world_position: null },
        { uuid: "mismatch", state: "UNVERIFIED", reason: "LOCATOR_PARENT_CHILD_MISMATCH", world_position: null },
      ],
    });
  });

  test("invalid Locator world position does not contaminate valid sibling", () => {
    const { animation, group } = setup();
    locatorUnder(group, "good", { position: [5, 2, 0] });
    locatorUnder(group, "bad", { position: [Number.NaN, 0, 0] });
    const result = observedPose(animation as any, group as any);
    expect(result.locator_candidates).toMatchObject({
      state: "PARTIAL", observed_count: 1,
      candidates: [
        { uuid: "bad", state: "UNVERIFIED", reason: "LOCATOR_WORLD_POSITION_INVALID" },
        { uuid: "good", state: "OBSERVED", world_position: [5, 2, 0] },
      ],
    });
  });

  test("ambiguous native Locator UUIDs are rejected, never selected by first match", () => {
    const { animation, group } = setup();
    locatorUnder(group, "duplicate");
    locatorUnder(group, "duplicate");
    const result = observedPose(animation as any, group as any);
    expect(result.locator_candidates).toMatchObject({
      state: "UNVERIFIED", reason: "AMBIGUOUS_NATIVE_LOCATOR_IDENTITY",
      count: null, observed_count: 0, candidates: [],
    });
  });

  test("marker collection is bounded without hiding truncated candidates", () => {
    const { animation, group } = setup();
    for (let i = 0; i < 17; i++) locatorUnder(group, "marker-" + i);
    const result = observedPose(animation as any, group as any);
    expect(result.locator_candidates).toMatchObject({
      state: "UNVERIFIED", reason: "NATIVE_LOCATOR_EVIDENCE_LIMIT_EXCEEDED",
      count: null, observed_count: 0, candidates: [],
    });
  });

  test("missing Locator runtime and missing Group children stay unverified", () => {
    const { animation, group } = setup();
    globals.Locator = undefined;
    expect(readCurrentBonePoseSnapshot(animation as any, group as any).locator_candidates)
      .toMatchObject({ state: "UNVERIFIED", reason: "NATIVE_LOCATOR_LIST_UNAVAILABLE" });
    globals.Locator = { all: [] };
    (group as any).children = undefined;
    expect(readCurrentBonePoseSnapshot(animation as any, group as any).locator_candidates)
      .toMatchObject({ state: "UNVERIFIED", reason: "NATIVE_GROUP_CHILDREN_UNAVAILABLE" });
  });

  test("a nested Group's child Locator is not misattributed to a focused parent bone", () => {
    const { animation, group } = setup();
    const child = { uuid: "child-bone", children: [] as any[] };
    locatorUnder(child, "nested-locator", { parent: child });
    const result = observedPose(animation as any, group as any);
    expect(result.locator_candidates).toMatchObject({
      state: "NONE", count: 0, observed_count: 0, candidates: [],
    });
  });

  test("source integration is focused and introduces no keyframe/timeline mutator", async () => {
    const code = await Bun.file("server/tools/animation/inspection.ts").text();
    const snapshot = await Bun.file("server/tools/animation/currentPose.ts").text();
    expect(code).toContain("current_pose_snapshot: readCurrentBonePoseSnapshot(animation, group)");
    expect(code).not.toContain("sample_animation_contacts");
    expect(snapshot).not.toContain("Timeline.setTime(");
    expect(snapshot).not.toContain("Animator.preview(");
    expect(snapshot).not.toContain("Animation.select(");
    expect(snapshot).toContain("frame_pose_synchronized: false");
    expect(snapshot).toContain("contact_marker_attested: false");
  });
});
