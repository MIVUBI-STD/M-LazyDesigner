import { describe, expect, test } from "bun:test";
import { boneRiggingParameters } from "@/server/tools/animation-rigging";

describe("Blockbench 5.2 native adoption", () => {
  test("native IK controller updates stay inside the existing rigging capability", () => {
    const parsed = boneRiggingParameters.parse({
      action: "set_ik_controller",
      bone_data: {
        controller: "ik_controller",
        controller_target: "foot",
        controller_source: "upper_leg",
        controller_pole: "knee_pole",
        lock_ik_target_rotation: true,
      },
    });

    expect(parsed.action).toBe("set_ik_controller");
    expect(parsed.bone_data.name).toBeUndefined();
    expect(parsed.bone_data.controller_pole).toBe("knee_pole");
  });

  test("native IK controller supports explicit link clearing", () => {
    const parsed = boneRiggingParameters.parse({
      action: "set_ik_controller",
      bone_data: {
        controller: "ik_controller",
        controller_target: null,
        controller_source: null,
        controller_pole: null,
      },
    });

    expect(parsed.bone_data.controller_target).toBeNull();
    expect(parsed.bone_data.controller_source).toBeNull();
    expect(parsed.bone_data.controller_pole).toBeNull();
  });

  test("native IK controller updates fail closed when no mutation is requested", () => {
    expect(
      boneRiggingParameters.safeParse({
        action: "set_ik_controller",
        bone_data: {
          controller: "ik_controller",
        },
      }).success
    ).toBe(false);

    expect(
      boneRiggingParameters.safeParse({
        action: "set_ik_controller",
        bone_data: {
          controller_pole: "knee_pole",
        },
      }).success
    ).toBe(false);

    expect(
      boneRiggingParameters.safeParse({
        action: "set_ik_controller",
        bone_data: {
          controller: "ik_controller",
          ik_target: "legacy_bone_target",
        },
      }).success
    ).toBe(false);
  });

  test("non-controller rig actions still require bone_data.name", () => {
    expect(
      boneRiggingParameters.safeParse({
        action: "set_ik",
        bone_data: {
          ik_enabled: true,
          ik_target: "foot_target",
        },
      }).success
    ).toBe(false);
  });

  test("legacy bone IK contract remains accepted", () => {
    expect(
      boneRiggingParameters.safeParse({
        action: "set_ik",
        bone_data: {
          name: "leg",
          ik_enabled: true,
          ik_target: "foot_target",
        },
      }).success
    ).toBe(true);
  });
});
