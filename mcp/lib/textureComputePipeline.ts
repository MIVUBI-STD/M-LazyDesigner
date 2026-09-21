import {
  autoLevelsRgba,
  createTextureColorComputeContext,
  directionalShadeRgba,
  generateShadeRamp,
  gradientMapRgba,
  palettizeErrorDiffusionRgba,
  palettizeRgba,
  posterizeLightnessRgba,
  type AutoLevelsOptions,
  type DirectionalShadeOptions,
  type ErrorDiffusionOptions,
  type GradientMapOptions,
  type PalettizeOptions,
  type PosterizeOptions,
  type ShadeRampOptions,
  type TextureColorComputeContext,
  type TextureColorComputeMetrics,
} from "@/lib/textureColorEngine";

export type TextureComputeStep =
  | {
      operation: "auto_levels";
      options?: AutoLevelsOptions;
    }
  | {
      operation: "directional_shade";
      options?: DirectionalShadeOptions;
    }
  | {
      operation: "posterize";
      options: PosterizeOptions;
    }
  | {
      operation: "gradient_map";
      ramp: readonly string[];
      options?: GradientMapOptions;
    }
  | {
      operation: "generated_gradient_map";
      base_color: string;
      ramp: ShadeRampOptions;
      options?: GradientMapOptions;
    }
  | {
      operation: "palettize";
      palette: readonly string[];
      options?: PalettizeOptions;
    }
  | {
      operation: "palette_diffusion";
      palette: readonly string[];
      options?: ErrorDiffusionOptions;
    };

export type TextureComputeReceipt = {
  operation_count: number;
  requested_operation_count: number;
  operations: TextureComputeStep["operation"][];
  skipped_operations: TextureComputeStep["operation"][];
  rewrites: string[];
  changed_pixels: number;
  changed_rect: [number, number, number, number] | null;
  color_cache: TextureColorComputeMetrics;
  execution: {
    fused_groups: number;
    fused_steps: number;
    unique_color_transforms: number;
  };
};

export type TextureComputeResult = {
  pixels: Uint8ClampedArray;
  receipt: TextureComputeReceipt;
};

function changedRect(
  before: Uint8ClampedArray,
  after: Uint8ClampedArray,
  width: number,
  height: number
): {
  count: number;
  rect: [number, number, number, number] | null;
} {
  let count = 0;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    if (
      before[offset] === after[offset] &&
      before[offset + 1] === after[offset + 1] &&
      before[offset + 2] === after[offset + 2] &&
      before[offset + 3] === after[offset + 3]
    ) {
      continue;
    }

    count += 1;
    const x = index % width;
    const y = Math.floor(index / width);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }

  return {
    count,
    rect:
      count === 0
        ? null
        : [left, top, right + 1, bottom + 1],
  };
}

function optimizeTextureComputeSteps(
  steps: readonly TextureComputeStep[]
): {
  steps: TextureComputeStep[];
  skipped: TextureComputeStep["operation"][];
  rewrites: string[];
} {
  const optimized: TextureComputeStep[] = [];
  const skipped: TextureComputeStep["operation"][] = [];
  const rewrites: string[] = [];

  for (const step of steps) {
    if (
      step.operation === "auto_levels" &&
      step.options?.strength === 0
    ) {
      skipped.push(step.operation);
      continue;
    }
    if (
      step.operation === "directional_shade" &&
      step.options?.strength === 0
    ) {
      skipped.push(step.operation);
      continue;
    }
    if (
      step.operation === "posterize" &&
      step.options.strength === 0
    ) {
      skipped.push(step.operation);
      continue;
    }
    if (
      step.operation === "palette_diffusion" &&
      step.options?.strength === 0
    ) {
      optimized.push({
        operation: "palettize",
        palette: step.palette,
        options: { dither: "none" },
      });
      rewrites.push("palette_diffusion(strength=0)->palettize(nearest)");
      continue;
    }
    if (
      step.operation === "palettize" &&
      step.palette.length === 1 &&
      step.options?.dither === "ordered"
    ) {
      optimized.push({
        ...step,
        options: { ...step.options, dither: "none" },
      });
      rewrites.push("single_color_ordered_palettize->nearest");
      continue;
    }
    if (
      step.operation === "gradient_map" &&
      step.options?.mode === "ordered" &&
      new Set(step.ramp.map((color) => color.toUpperCase())).size === 1
    ) {
      optimized.push({
        ...step,
        options: { ...step.options, mode: "nearest" },
      });
      rewrites.push("constant_ordered_gradient->nearest");
      continue;
    }
    optimized.push(step);
  }

  if (optimized.length === 0) {
    throw new Error(
      "Texture compute pipeline contains only no-op steps; no authored change is required."
    );
  }
  return { steps: optimized, skipped, rewrites };
}

function packedRgbAt(
  pixels: Uint8ClampedArray,
  offset: number
): number {
  return (
    (pixels[offset] << 16) |
    (pixels[offset + 1] << 8) |
    pixels[offset + 2]
  ) >>> 0;
}

function paletteRgbSet(palette: readonly string[]): Set<number> {
  return new Set(
    palette.map((color) => Number.parseInt(color.slice(1, 7), 16))
  );
}

function bitmapAlreadyInPalette(
  pixels: Uint8ClampedArray,
  palette: readonly string[]
): boolean {
  const allowed = paletteRgbSet(palette);
  const pixelCount = pixels.length / 4;

  // Cheaply reject likely non-compliant inputs before paying for a proof scan.
  const sampleCount = Math.min(64, pixelCount);
  const stride = Math.max(1, Math.floor(pixelCount / sampleCount));
  for (let index = 0; index < pixelCount; index += stride) {
    const offset = index * 4;
    if (pixels[offset + 3] === 0) continue;
    if (!allowed.has(packedRgbAt(pixels, offset))) return false;
  }

  // A skip requires proof; only compliant-looking inputs pay for the full scan.
  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] === 0) continue;
    if (!allowed.has(packedRgbAt(pixels, offset))) return false;
  }
  return true;
}

function isFusiblePointwiseStep(step: TextureComputeStep): boolean {
  if (step.operation === "posterize") return true;
  if (step.operation === "gradient_map") {
    return (step.options?.mode ?? "nearest") !== "ordered";
  }
  if (step.operation === "generated_gradient_map") {
    return (step.options?.mode ?? "nearest") !== "ordered";
  }
  if (step.operation === "palettize") {
    return (step.options?.dither ?? "none") === "none";
  }
  return false;
}

function rgbaPackedKey(
  pixels: Uint8ClampedArray,
  offset: number
): number {
  return (
    ((pixels[offset] & 0xff) << 24) |
    ((pixels[offset + 1] & 0xff) << 16) |
    ((pixels[offset + 2] & 0xff) << 8) |
    (pixels[offset + 3] & 0xff)
  ) >>> 0;
}

function applyFusedPointwiseSteps(
  pixels: Uint8ClampedArray,
  steps: readonly TextureComputeStep[],
  context: TextureColorComputeContext
): {
  pixels: Uint8ClampedArray;
  unique_color_transforms: number;
} {
  const output = new Uint8ClampedArray(pixels);
  const transformed = new Map<number, [number, number, number, number]>();

  for (let offset = 0; offset < pixels.length; offset += 4) {
    if (pixels[offset + 3] === 0) continue;
    const key = rgbaPackedKey(pixels, offset);
    let mapped = transformed.get(key);
    if (!mapped) {
      let sample: Uint8ClampedArray<ArrayBufferLike> =
        new Uint8ClampedArray([
        pixels[offset],
        pixels[offset + 1],
        pixels[offset + 2],
        pixels[offset + 3],
      ]);
      for (const step of steps) {
        sample = applyStep(sample, 1, 1, step, context);
      }
      mapped = [sample[0], sample[1], sample[2], sample[3]];
      transformed.set(key, mapped);
    }
    output[offset] = mapped[0];
    output[offset + 1] = mapped[1];
    output[offset + 2] = mapped[2];
    output[offset + 3] = mapped[3];
  }

  return {
    pixels: output,
    unique_color_transforms: transformed.size,
  };
}

function applyStep(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  step: TextureComputeStep,
  context: TextureColorComputeContext
): Uint8ClampedArray {
  switch (step.operation) {
    case "auto_levels":
      return autoLevelsRgba(pixels, width, height, step.options, context);

    case "directional_shade":
      return directionalShadeRgba(pixels, width, height, step.options, context);

    case "posterize":
      return posterizeLightnessRgba(
        pixels,
        width,
        height,
        step.options,
        context
      );

    case "gradient_map":
      return gradientMapRgba(
        pixels,
        width,
        height,
        step.ramp,
        step.options,
        context
      );

    case "generated_gradient_map": {
      const ramp = generateShadeRamp(step.base_color, step.ramp);
      return gradientMapRgba(
        pixels,
        width,
        height,
        ramp,
        step.options,
        context
      );
    }

    case "palettize":
      return palettizeRgba(
        pixels,
        width,
        height,
        step.palette,
        step.options,
        context
      );

    case "palette_diffusion":
      return palettizeErrorDiffusionRgba(
        pixels,
        width,
        height,
        step.palette,
        step.options,
        context
      );
  }
}

export function applyTextureComputePipeline(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  steps: readonly TextureComputeStep[]
): TextureComputeResult {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    source.byteLength !== width * height * 4
  ) {
    throw new Error("Texture compute pipeline requires a valid RGBA bitmap.");
  }
  if (steps.length < 1 || steps.length > 12) {
    throw new Error("Texture compute pipeline requires 1 to 12 steps.");
  }

  const plan = optimizeTextureComputeSteps(steps);
  const context = createTextureColorComputeContext();
  let pixels: Uint8ClampedArray<ArrayBufferLike> = source;
  const executed: TextureComputeStep["operation"][] = [];
  const skipped = [...plan.skipped];
  let fusedGroups = 0;
  let fusedSteps = 0;
  let uniqueColorTransforms = 0;

  for (let index = 0; index < plan.steps.length; ) {
    const step = plan.steps[index];

    if (
      (step.operation === "palettize" ||
        step.operation === "palette_diffusion") &&
      bitmapAlreadyInPalette(pixels, step.palette)
    ) {
      skipped.push(step.operation);
      index += 1;
      continue;
    }

    if (isFusiblePointwiseStep(step)) {
      const group: TextureComputeStep[] = [step];
      let cursor = index + 1;
      while (
        cursor < plan.steps.length &&
        isFusiblePointwiseStep(plan.steps[cursor])
      ) {
        group.push(plan.steps[cursor]);
        cursor += 1;
      }

      if (group.length >= 2) {
        const fused = applyFusedPointwiseSteps(
          pixels,
          group,
          context
        );
        pixels = fused.pixels;
        executed.push(...group.map((item) => item.operation));
        fusedGroups += 1;
        fusedSteps += group.length;
        uniqueColorTransforms += fused.unique_color_transforms;
        index = cursor;
        continue;
      }
    }

    pixels = applyStep(pixels, width, height, step, context);
    executed.push(step.operation);
    index += 1;
  }

  const changed = changedRect(source, pixels, width, height);
  if (changed.count === 0) {
    throw new Error(
      "Texture compute pipeline produced no authored pixel change."
    );
  }

  return {
    pixels,
    receipt: {
      operation_count: executed.length,
      requested_operation_count: steps.length,
      operations: executed,
      skipped_operations: skipped,
      rewrites: plan.rewrites,
      changed_pixels: changed.count,
      changed_rect: changed.rect,
      color_cache: { ...context.metrics },
      execution: {
        fused_groups: fusedGroups,
        fused_steps: fusedSteps,
        unique_color_transforms: uniqueColorTransforms,
      },
    },
  };
}
