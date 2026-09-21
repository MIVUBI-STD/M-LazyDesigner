import { describe, expect, test } from "bun:test";
import { applyTextureComputePipeline } from "@/lib/textureComputePipeline";
import {
  gradientMapRgba,
  palettizeRgba,
  posterizeLightnessRgba,
} from "@/lib/textureColorEngine";
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

  test("adaptive planner skips explicit no-ops before execution", () => {
    const source = new Uint8ClampedArray([
      60, 60, 60, 255,
      180, 180, 180, 255,
    ]);
    const result = applyTextureComputePipeline(source, 2, 1, [
      { operation: "auto_levels", options: { strength: 0 } },
      { operation: "posterize", options: { levels: 2, strength: 1 } },
    ]);

    expect(result.receipt.requested_operation_count).toBe(2);
    expect(result.receipt.operation_count).toBe(1);
    expect(result.receipt.skipped_operations).toContain("auto_levels");
    expect(result.receipt.operations).toEqual(["posterize"]);
  });

  test("zero-strength palette diffusion is rewritten to equivalent nearest mapping", () => {
    const source = new Uint8ClampedArray([
      110, 110, 110, 255,
      180, 180, 180, 255,
    ]);
    const result = applyTextureComputePipeline(source, 2, 1, [
      {
        operation: "palette_diffusion",
        palette: ["#000000", "#FFFFFF"],
        options: { strength: 0 },
      },
    ]);

    expect(result.receipt.rewrites).toContain(
      "palette_diffusion(strength=0)->palettize(nearest)"
    );
    expect(result.receipt.operations).toEqual(["palettize"]);
  });

  test("pointwise fusion avoids a second full compliance/remap pass", () => {
    const source = new Uint8ClampedArray([
      0, 0, 0, 255,
      255, 255, 255, 255,
      120, 120, 120, 255,
    ]);
    const result = applyTextureComputePipeline(source, 3, 1, [
      {
        operation: "posterize",
        options: { levels: 2, strength: 1 },
      },
      {
        operation: "palettize",
        palette: ["#000000", "#FFFFFF"],
        options: { dither: "none" },
      },
    ]);

    expect(result.receipt.operations).toEqual(["posterize", "palettize"]);
    expect(result.receipt.execution.fused_groups).toBe(1);
    expect(result.receipt.execution.fused_steps).toBe(2);
    expect(result.receipt.execution.unique_color_transforms).toBeLessThanOrEqual(3);
  });

  test("request-local color cache reuses repeated pixel conversions", () => {
    const source = new Uint8ClampedArray(
      Array.from({ length: 64 }, () => [120, 80, 40, 255]).flat()
    );
    const result = applyTextureComputePipeline(source, 8, 8, [
      {
        operation: "directional_shade",
        options: { depth: 2, strength: 0.8 },
      },
      {
        operation: "generated_gradient_map",
        base_color: "#845442",
        ramp: { steps: 5 },
        options: { mode: "nearest" },
      },
    ]);

    expect(result.receipt.color_cache.oklab_cache_hits).toBeGreaterThan(
      result.receipt.color_cache.oklab_cache_misses
    );
  });

  test("fused pointwise pipeline is byte-identical to sequential execution", () => {
    const source = new Uint8ClampedArray(
      Array.from({ length: 64 }, (_, index) => {
        const value = index % 2 === 0 ? 90 : 170;
        return [value, value - 20, value - 40, 255];
      }).flat()
    );
    const ramp = ["#201510", "#845442", "#D8A070"];
    const palette = ["#201510", "#845442", "#D8A070"];

    const sequentialPosterize = posterizeLightnessRgba(
      source,
      8,
      8,
      { levels: 4, strength: 1 }
    );
    const sequentialGradient = gradientMapRgba(
      sequentialPosterize,
      8,
      8,
      ramp,
      { mode: "nearest" }
    );
    const sequential = palettizeRgba(
      sequentialGradient,
      8,
      8,
      palette,
      { dither: "none" }
    );

    const fused = applyTextureComputePipeline(source, 8, 8, [
      {
        operation: "posterize",
        options: { levels: 4, strength: 1 },
      },
      {
        operation: "gradient_map",
        ramp,
        options: { mode: "nearest" },
      },
      {
        operation: "palettize",
        palette,
        options: { dither: "none" },
      },
    ]);

    expect(Array.from(fused.pixels)).toEqual(Array.from(sequential));
    expect(fused.receipt.execution.fused_groups).toBe(1);
    expect(fused.receipt.execution.fused_steps).toBe(3);
    expect(fused.receipt.execution.unique_color_transforms).toBeLessThan(64);
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
