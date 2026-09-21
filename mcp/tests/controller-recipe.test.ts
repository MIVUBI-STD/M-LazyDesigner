import { describe, expect, test } from "bun:test";
import { compileControllerRecipe } from "@/lib/animation/controllerRecipe";

describe("controller recipe compiler", () => {
  test("compiles behavior intent into existing controller operations", () => {
    const compiled = compileControllerRecipe({
      name: "controller.animation.fisher",
      initial_state: "idle",
      states: [
        { id: "idle", name: "idle", animation: "animation.fisher.idle", transitions: [{ target: "cast", condition: "query.any_animation_finished" }] },
        { id: "cast", name: "cast", animation: "animation.fisher.cast", transitions: [{ target: "idle", condition: "query.all_animations_finished" }] },
      ],
    });
    expect(compiled.create_name).toBe("controller.animation.fisher");
    expect(compiled.operations.map((op) => op.op)).toEqual(["add_state","add_state","add_animation","add_transition","add_animation","add_transition","set_initial_state"]);
  });
});
