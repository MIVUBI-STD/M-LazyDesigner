import { describe, expect, test } from "bun:test";
import { applyTextureComputePipeline } from "@/lib/textureComputePipeline";
import { parseTextureComputeSteps } from "@/lib/textureComputeRequest";

describe("texture compute request and pipeline", () => {
  test("parses compact compute steps into strict internal operations", () => {
    const steps = parseTextureComputeSteps([
      { operation: "auto_levels", args: { strength: 0.8 } },
      {
        operation: "generated_gradient_map",
        args: {
          base_color: "#845442",
          steps: 5,
          mode: "nearest",
        },
      },
      {
        operation: "palette_diffusion",
        args: {
          palette: ["#201510", "#845442", "#D8A070"],
          strength: 0.7,
        },
      },
    ]);

    expect(steps.map((step) => step.operation)).toEqual([
      "auto_levels",
      "generated_gradient_map",
      "palette_diffusion",
    ]);
  });

  test("invalid compute args fail closed with step context", () => {
    expect(() =>
      parseTextureComputeSteps([
        {
          operation: "posterize",
          args: { levels: 1 },
        },
      ])
    ).toThrow("compute[0] posterize is invalid");
  });

  test("pipeline returns bounded changed-state receipt", () => {
    const source = new Uint8ClampedArray([
      60, 60, 60, 255,
      90, 90, 90, 255,
      160, 160, 160, 255,
      220, 220, 220, 255,
    ]);
    const result = applyTextureComputePipeline(source, 4, 1, [
      {
        operation: "generated_gradient_map",
        base_color: "#845442",
        ramp: { steps: 5 },
        options: { mode: "nearest" },
      },
    ]);

    expect(result.receipt.operation_count).toBe(1);
    expect(result.receipt.operations).toEqual(["generated_gradient_map"]);
    expect(result.receipt.changed_pixels).toBeGreaterThan(0);
    expect(result.receipt.changed_rect).toEqual([0, 0, 4, 1]);
    expect(Array.from(result.pixels)).not.toEqual(Array.from(source));
  });

  test("pipeline rejects no-op compute results", () => {
    const source = new Uint8ClampedArray([0, 0, 0, 0]);
    expect(() =>
      applyTextureComputePipeline(source, 1, 1, [
        { operation: "auto_levels" },
      ])
    ).toThrow("no authored pixel change");
  });
});
