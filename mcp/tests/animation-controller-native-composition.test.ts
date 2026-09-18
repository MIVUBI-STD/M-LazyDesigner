import { describe, expect, test } from "bun:test";
import {
  controllerGraphHasCycleFrom,
  normalizeControllerBlendCurve,
  wouldCreateControllerCompositionCycle,
} from "@/lib/animationControllerComposition";
import { animationControllerNativeParameters } from "@/server/tools/animation-controller-native-intelligence";

describe("native Bedrock controller composition", () => {
  test("normalizes bounded blend curves deterministically", () => {
    expect(
      normalizeControllerBlendCurve([
        { time: 1, value: 1 },
        { time: 0, value: 0 },
        { time: 0.5, value: 0.8 },
      ])
    ).toEqual({ "0": 0, "0.5": 0.8, "1": 1 });

    expect(() =>
      normalizeControllerBlendCurve([
        { time: 0, value: 0 },
        { time: 0, value: 1 },
      ])
    ).toThrow(/appears more than once/);
    expect(() =>
      normalizeControllerBlendCurve([
        { time: -0.1, value: 0 },
        { time: 1, value: 1 },
      ])
    ).toThrow(/time 0\.\.1/);
  });

  test("detects nested-controller cycles before authoring", () => {
    const graph = {
      A: ["B"],
      B: ["C"],
      C: [],
      D: ["E"],
      E: ["D"],
    };
    expect(wouldCreateControllerCompositionCycle(graph, "C", "A")).toBe(true);
    expect(wouldCreateControllerCompositionCycle(graph, "A", "C")).toBe(false);
    expect(controllerGraphHasCycleFrom(graph, "D")).toBe(true);
    expect(controllerGraphHasCycleFrom(graph, "A")).toBe(false);
    expect(wouldCreateControllerCompositionCycle(graph, "D", "D")).toBe(true);
  });

  test("one existing controller tool owns nested links and blend curves", () => {
    const parsed = animationControllerNativeParameters.parse({
      controller_id: "controller.animation.example",
      native_operations: [
        {
          op: "set_state_blend",
          state: "walk",
          blend_transition: 0.2,
          blend_via_shortest_path: true,
          blend_curve: [
            { time: 0, value: 0 },
            { time: 0.5, value: 0.8 },
            { time: 1, value: 1 },
          ],
        },
        {
          op: "add_animation_item",
          state: "walk",
          item: "controller.animation.look",
          blend_value: "math.clamp(v.look_weight, 0, 1)",
        },
      ],
    });
    expect(parsed.native_operations).toHaveLength(2);

    expect(
      animationControllerNativeParameters.safeParse({
        controller_id: "controller.animation.example",
        native_operations: [{ op: "set_state_blend", state: "walk" }],
      }).success
    ).toBe(false);
    expect(
      animationControllerNativeParameters.safeParse({
        controller_id: "controller.animation.example",
        native_operations: [
          { op: "update_animation_item", state: "walk", id: "link" },
        ],
      }).success
    ).toBe(false);
  });

  test("native composition preserves zero and explicit blend reset semantics", () => {
    expect(
      animationControllerNativeParameters.safeParse({
        controller_id: "controller.animation.example",
        native_operations: [
          {
            op: "add_animation_item",
            state: "walk",
            item: "animation.example.walk",
            blend_value: 0,
          },
          {
            op: "update_animation_item",
            state: "walk",
            id: "link-uuid",
            blend_value: null,
          },
        ],
      }).success
    ).toBe(true);
  });

  test("advanced controller support does not expand MCP tool count", async () => {
    const [source, server, bootstrap] = await Promise.all([
      Bun.file("server/tools/animation-controller-native-intelligence.ts").text(),
      Bun.file("server/server.ts").text(),
      Bun.file("server/runtime/extensions.ts").text(),
    ]);
    expect(source).toContain('getAllToolDefinitions()["manage_animation_controller"]');
    expect(source).toContain("native_operations");
    expect(source).toContain("set_state_blend");
    expect(source).toContain("add_animation_item");
    expect(source).toContain("wouldCreateControllerCompositionCycle");
    expect(source).not.toContain("createTool(");
    expect(server).toContain("initializeRuntimeCapabilityWiring();");
    expect(bootstrap).toContain("apply: wireAnimationControllerNativeIntelligence");
  });
});
