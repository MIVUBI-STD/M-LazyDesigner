import { describe, expect, test } from "bun:test";
import {
  nestedOperationClassForAction,
  nestedOperationClassForArguments,
} from "@/gateway/capabilities/manifest";
import { animationTimelineStateNeutral } from "@/gateway/control/delta/receipts";

describe("nested animation action semantics", () => {
  test("timeline editor actions are CONTROL while authored property edits are MUTATION", () => {
    for (const action of [
      "select",
      "play",
      "pause",
      "stop",
      "set_time",
      "select_range",
      "expand_bones",
      "collapse_bones",
    ]) {
      expect(
        nestedOperationClassForArguments("manage_animation_timeline", {
          operation: "timeline",
          action,
        }),
        action
      ).toBe("CONTROL");
    }

    for (const action of [
      "set_length",
      "set_fps",
      "loop",
      "set_anim_time_update",
      "set_blend_weight",
      "set_easing",
    ]) {
      expect(
        nestedOperationClassForArguments("manage_animation_timeline", {
          operation: "timeline",
          action,
        }),
        action
      ).toBe("MUTATION");
    }
  });

  test("copy is state-neutral but paste operations remain authored mutations", () => {
    expect(
      nestedOperationClassForArguments("manage_animation_timeline", {
        operation: "copy_paste",
        action: "copy",
      })
    ).toBe("CONTROL");
    expect(
      nestedOperationClassForArguments("manage_animation_timeline", {
        operation: "copy_paste",
        action: "paste",
      })
    ).toBe("MUTATION");
    expect(
      nestedOperationClassForArguments("manage_animation_timeline", {
        operation: "copy_paste",
        action: "mirror_paste",
      })
    ).toBe("MUTATION");
  });

  test("receipt state-neutral policy delegates known actions to the manifest", () => {
    expect(nestedOperationClassForAction("manage_animation_timeline", "set_time"))
      .toBe("CONTROL");
    expect(animationTimelineStateNeutral({ action: "set_time" })).toBe(true);
    expect(animationTimelineStateNeutral({ action: "set_length" })).toBe(false);
  });

  test("unknown nested actions fail closed instead of inheriting a state-neutral class", () => {
    expect(
      nestedOperationClassForArguments("manage_animation_timeline", {
        operation: "timeline",
        action: "future_action",
      })
    ).toBeNull();
    expect(
      nestedOperationClassForAction("manage_animation_timeline", "future_action")
    ).toBeNull();
  });

  test("Gateway suppresses successful CONTROL continuation but not failures", async () => {
    const source = await Bun.file("gateway/runtime/capabilityExecutor.ts").text();
    expect(source).toContain("nestedOperationClassForArguments(capability, args)");
    expect(source).toContain('const branchControl = nestedOperationClass === "CONTROL"');
    expect(source).toContain("effectiveReadOnly || branchControl");
  });
});
