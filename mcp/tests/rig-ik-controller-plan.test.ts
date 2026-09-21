import { describe, expect, test } from "bun:test";
import { compileNativeIkControllerIntent } from "@/lib/rig/ikControllerPlan";

describe("native IK controller intent compiler", () => {
  test("compiles into existing bone_rigging contract", () => {
    expect(compileNativeIkControllerIntent({
      controller:"ik_arm", target:"hand_target", source:"upper_arm", pole:"elbow_pole"
    })).toEqual({
      action:"set_ik_controller",
      bone_data:{
        controller:"ik_arm",
        controller_target:"hand_target",
        controller_source:"upper_arm",
        controller_pole:"elbow_pole",
      },
    });
  });
});
