import {
  autoLevelsRgba,
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
  operations: TextureComputeStep["operation"][];
  changed_pixels: number;
  changed_rect: [number, number, number, number] | null;
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

function applyStep(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  step: TextureComputeStep
): Uint8ClampedArray {
  switch (step.operation) {
    case "auto_levels":
      return autoLevelsRgba(pixels, width, height, step.options);

    case "directional_shade":
      return directionalShadeRgba(pixels, width, height, step.options);

    case "posterize":
      return posterizeLightnessRgba(
        pixels,
        width,
        height,
        step.options
      );

    case "gradient_map":
      return gradientMapRgba(
        pixels,
        width,
        height,
        step.ramp,
        step.options
      );

    case "generated_gradient_map": {
      const ramp = generateShadeRamp(step.base_color, step.ramp);
      return gradientMapRgba(
        pixels,
        width,
        height,
        ramp,
        step.options
      );
    }

    case "palettize":
      return palettizeRgba(
        pixels,
        width,
        height,
        step.palette,
        step.options
      );

    case "palette_diffusion":
      return palettizeErrorDiffusionRgba(
        pixels,
        width,
        height,
        step.palette,
        step.options
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

  let pixels: Uint8ClampedArray<ArrayBufferLike> =
    new Uint8ClampedArray(source);
  for (const step of steps) {
    pixels = applyStep(pixels, width, height, step);
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
      operation_count: steps.length,
      operations: steps.map((step) => step.operation),
      changed_pixels: changed.count,
      changed_rect: changed.rect,
    },
  };
}
