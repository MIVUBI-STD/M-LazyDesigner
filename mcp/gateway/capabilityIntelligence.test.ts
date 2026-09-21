import { describe, expect, test } from "bun:test";
import { searchCapabilityCatalog, type BackendTool } from "./contract";

const tool = (name: string, description = ""): BackendTool => ({
  name,
  description,
  annotations: {},
});

describe("capability intelligence routing", () => {
  const tools = [
    tool("manage_cubes", "Create and update Bedrock cubes."),
    tool("reparent_element", "Move an element to another parent."),
    tool("manage_uv_layout", "Plan or apply UV layout."),
    tool("gradient_tool", "Apply a texture gradient."),
    tool("manage_animation_timeline", "Manage animation timeline data."),
  ];

  test("selects semantic operation branches without loading schemas", () => {
    const [result] = searchCapabilityCatalog(
      tools,
      "make the chair leg taller",
      4,
      { authoringPhase: "geometry" }
    );

    expect(result?.capability_id).toBe("manage_cubes");
    expect(result?.branch).toEqual({ field: "operation", value: "update" });
    expect(result?.why).toContain("action");
  });

  test("distinguishes hierarchy changes from transform mutations", () => {
    const [result] = searchCapabilityCatalog(
      tools,
      "move this cube under another bone",
      4,
      { authoringPhase: "geometry" }
    );

    expect(result?.capability_id).toBe("reparent_element");
  });

  test("selects UV planning branch for layout intent", () => {
    const [result] = searchCapabilityCatalog(
      tools,
      "pack uv islands without overlap",
      4,
      { authoringPhase: "texturing" }
    );

    expect(result?.capability_id).toBe("manage_uv_layout");
    expect(result?.branch).toEqual({ field: "operation", value: "plan" });
  });

  test("uses active phase as a ranking prior rather than a hard filter", () => {
    const results = searchCapabilityCatalog(
      tools,
      "edit timeline keyframe",
      4,
      { authoringPhase: "animation" }
    );

    expect(results[0]?.capability_id).toBe("manage_animation_timeline");
  });

  test("keeps exact capability lookup branch-free and deterministic", () => {
    const [result] = searchCapabilityCatalog(
      tools,
      "manage_cubes",
      4,
      { authoringPhase: "texturing" }
    );

    expect(result?.capability_id).toBe("manage_cubes");
    expect(result?.branch).toBeUndefined();
    expect(result?.why).toBeUndefined();
  });
});
