export type Rgba = [number, number, number, number];

export type Oklab = {
  L: number;
  a: number;
  b: number;
};

export type Oklch = {
  L: number;
  C: number;
  h: number;
};

export type ShadeRampOptions = {
  steps: number;
  shadowLightnessDelta?: number;
  highlightLightnessDelta?: number;
  shadowHueShift?: number;
  highlightHueShift?: number;
  shadowChromaScale?: number;
  highlightChromaScale?: number;
};

export type OrderedDitherMatrix = "bayer2" | "bayer4" | "bayer8";

export type GradientMapMode = "nearest" | "blend" | "ordered";

export type GradientMapOptions = {
  mode?: GradientMapMode;
  matrix?: OrderedDitherMatrix;
};

export type PalettizeOptions = {
  dither?: "none" | "ordered";
  matrix?: OrderedDitherMatrix;
};

export type PaletteExtractionOptions = {
  maxSamples?: number;
  alphaThreshold?: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function srgbChannelToLinear(value: number): number {
  const c = clamp01(value);
  return c <= 0.04045
    ? c / 12.92
    : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearChannelToSrgb(value: number): number {
  const c = clamp01(value);
  return c <= 0.0031308
    ? 12.92 * c
    : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function byte(value: number): number {
  return Math.round(clamp01(value) * 255);
}

export function parseHexRgba(value: string): Rgba {
  if (!/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(value)) {
    throw new Error("Expected #RRGGBB or #RRGGBBAA color.");
  }
  const hex = value.slice(1);
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
    hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) : 255,
  ];
}

export function rgbaToHex(
  rgba: Rgba,
  includeAlpha = rgba[3] !== 255
): string {
  const parts = rgba.map((component) =>
    Math.min(255, Math.max(0, Math.round(component)))
      .toString(16)
      .padStart(2, "0")
  );
  return `#${parts.slice(0, includeAlpha ? 4 : 3).join("").toUpperCase()}`;
}

export function rgbaToOklab(rgba: Rgba): Oklab {
  const r = srgbChannelToLinear(rgba[0] / 255);
  const g = srgbChannelToLinear(rgba[1] / 255);
  const b = srgbChannelToLinear(rgba[2] / 255);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  return {
    L: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot,
  };
}

export function oklabToRgba(lab: Oklab, alpha = 255): Rgba {
  const lRoot = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const mRoot = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const sRoot = lab.L - 0.0894841775 * lab.a - 1.291485548 * lab.b;

  const l = lRoot * lRoot * lRoot;
  const m = mRoot * mRoot * mRoot;
  const s = sRoot * sRoot * sRoot;

  const r =
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g =
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b =
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return [
    byte(linearChannelToSrgb(r)),
    byte(linearChannelToSrgb(g)),
    byte(linearChannelToSrgb(b)),
    Math.min(255, Math.max(0, Math.round(alpha))),
  ];
}

export function oklabToOklch(lab: Oklab): Oklch {
  const C = Math.hypot(lab.a, lab.b);
  const h =
    C < 1e-12
      ? 0
      : ((Math.atan2(lab.b, lab.a) * 180) / Math.PI + 360) % 360;
  return { L: lab.L, C, h };
}

export function oklchToOklab(lch: Oklch): Oklab {
  const radians = (lch.h * Math.PI) / 180;
  return {
    L: lch.L,
    a: lch.C * Math.cos(radians),
    b: lch.C * Math.sin(radians),
  };
}

function shortestHueDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function interpolateOklch(left: Oklch, right: Oklch, t: number): Oklch {
  const hueDelta = shortestHueDelta(left.h, right.h);
  return {
    L: left.L + (right.L - left.L) * t,
    C: left.C + (right.C - left.C) * t,
    h: (left.h + hueDelta * t + 360) % 360,
  };
}

export function generateShadeRamp(
  baseHex: string,
  options: ShadeRampOptions
): string[] {
  const steps = options.steps;
  if (!Number.isInteger(steps) || steps < 2 || steps > 16) {
    throw new Error("Shade ramp steps must be an integer from 2 to 16.");
  }

  const base = parseHexRgba(baseHex);
  const baseLch = oklabToOklch(rgbaToOklab(base));
  const shadow: Oklch = {
    L: clamp01(
      baseLch.L + (options.shadowLightnessDelta ?? -0.22)
    ),
    C: Math.max(
      0,
      baseLch.C * (options.shadowChromaScale ?? 1.08)
    ),
    h:
      (baseLch.h + (options.shadowHueShift ?? -8) + 360) %
      360,
  };
  const highlight: Oklch = {
    L: clamp01(
      baseLch.L + (options.highlightLightnessDelta ?? 0.22)
    ),
    C: Math.max(
      0,
      baseLch.C * (options.highlightChromaScale ?? 0.88)
    ),
    h:
      (baseLch.h + (options.highlightHueShift ?? 8) + 360) %
      360,
  };

  const colors: string[] = [];
  for (let index = 0; index < steps; index += 1) {
    const t = index / (steps - 1);
    let lch: Oklch;
    if (t <= 0.5) {
      lch = interpolateOklch(shadow, baseLch, t * 2);
    } else {
      lch = interpolateOklch(baseLch, highlight, (t - 0.5) * 2);
    }
    colors.push(
      rgbaToHex(oklabToRgba(oklchToOklab(lch), base[3]))
    );
  }
  return colors;
}

function oklabDistanceSquared(left: Oklab, right: Oklab): number {
  const dL = left.L - right.L;
  const da = left.a - right.a;
  const db = left.b - right.b;
  return dL * dL + da * da + db * db;
}

export function nearestPaletteIndex(
  rgba: Rgba,
  palette: readonly string[]
): number {
  if (palette.length === 0) {
    throw new Error("Palette must contain at least one color.");
  }
  const target = rgbaToOklab(rgba);
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < palette.length; index += 1) {
    const distance = oklabDistanceSquared(
      target,
      rgbaToOklab(parseHexRgba(palette[index]))
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return bestIndex;
}

function twoNearestPaletteIndices(
  rgba: Rgba,
  palette: readonly string[]
): {
  first: number;
  second: number;
  firstDistance: number;
  secondDistance: number;
} {
  if (palette.length === 0) {
    throw new Error("Palette must contain at least one color.");
  }
  const target = rgbaToOklab(rgba);
  let first = 0;
  let second = 0;
  let firstDistance = Number.POSITIVE_INFINITY;
  let secondDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < palette.length; index += 1) {
    const distance = oklabDistanceSquared(
      target,
      rgbaToOklab(parseHexRgba(palette[index]))
    );
    if (distance < firstDistance) {
      second = first;
      secondDistance = firstDistance;
      first = index;
      firstDistance = distance;
    } else if (distance < secondDistance) {
      second = index;
      secondDistance = distance;
    }
  }

  if (palette.length === 1) {
    second = first;
    secondDistance = firstDistance;
  }
  return { first, second, firstDistance, secondDistance };
}

function bayerMatrix(size: 2 | 4 | 8): number[][] {
  let matrix = [[0, 2], [3, 1]];
  let currentSize = 2;
  while (currentSize < size) {
    const nextSize = currentSize * 2;
    const next = Array.from({ length: nextSize }, () =>
      Array<number>(nextSize).fill(0)
    );
    for (let y = 0; y < currentSize; y += 1) {
      for (let x = 0; x < currentSize; x += 1) {
        const value = matrix[y][x] * 4;
        next[y][x] = value;
        next[y][x + currentSize] = value + 2;
        next[y + currentSize][x] = value + 3;
        next[y + currentSize][x + currentSize] = value + 1;
      }
    }
    matrix = next;
    currentSize = nextSize;
  }
  return matrix;
}

function matrixInfo(matrix: OrderedDitherMatrix) {
  const size = matrix === "bayer2" ? 2 : matrix === "bayer4" ? 4 : 8;
  const values = bayerMatrix(size);
  return { size, values, max: size * size };
}

function orderedThreshold(
  matrix: OrderedDitherMatrix,
  x: number,
  y: number
): number {
  const info = matrixInfo(matrix);
  return (info.values[y % info.size][x % info.size] + 0.5) / info.max;
}

function interpolateOklab(left: Oklab, right: Oklab, t: number): Oklab {
  return {
    L: left.L + (right.L - left.L) * t,
    a: left.a + (right.a - left.a) * t,
    b: left.b + (right.b - left.b) * t,
  };
}

function rampPosition(
  lightness: number,
  rampLength: number
): {
  leftIndex: number;
  rightIndex: number;
  localT: number;
} {
  if (rampLength <= 1) {
    return { leftIndex: 0, rightIndex: 0, localT: 0 };
  }
  const position = clamp01(lightness) * (rampLength - 1);
  const leftIndex = Math.floor(position);
  const rightIndex = Math.min(rampLength - 1, leftIndex + 1);
  return {
    leftIndex,
    rightIndex,
    localT: position - leftIndex,
  };
}

export function gradientMapRgba(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  ramp: readonly string[],
  options: GradientMapOptions = {}
): Uint8ClampedArray {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    pixels.byteLength !== width * height * 4
  ) {
    throw new Error("Gradient map requires a valid RGBA bitmap.");
  }
  if (ramp.length < 2 || ramp.length > 16) {
    throw new Error("Gradient map ramp must contain 2 to 16 colors.");
  }

  const colors = ramp.map(parseHexRgba);
  const labs = colors.map(rgbaToOklab);
  const mode = options.mode ?? "nearest";
  const matrix = options.matrix ?? "bayer4";
  const output = new Uint8ClampedArray(pixels);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = pixels[offset + 3];
      if (alpha === 0) continue;

      const source: Rgba = [
        pixels[offset],
        pixels[offset + 1],
        pixels[offset + 2],
        alpha,
      ];
      const sourceL = rgbaToOklab(source).L;
      const position = rampPosition(sourceL, ramp.length);
      let mapped: Rgba;

      if (mode === "nearest") {
        mapped = colors[
          position.localT < 0.5
            ? position.leftIndex
            : position.rightIndex
        ];
      } else if (mode === "blend") {
        mapped = oklabToRgba(
          interpolateOklab(
            labs[position.leftIndex],
            labs[position.rightIndex],
            position.localT
          ),
          alpha
        );
      } else {
        const threshold = orderedThreshold(matrix, x, y);
        mapped = colors[
          position.localT > threshold
            ? position.rightIndex
            : position.leftIndex
        ];
      }

      output[offset] = mapped[0];
      output[offset + 1] = mapped[1];
      output[offset + 2] = mapped[2];
      output[offset + 3] = alpha;
    }
  }
  return output;
}

export function palettizeRgba(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  palette: readonly string[],
  options: PalettizeOptions = {}
): Uint8ClampedArray {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    pixels.byteLength !== width * height * 4
  ) {
    throw new Error("Palettize requires a valid RGBA bitmap.");
  }
  if (palette.length < 1 || palette.length > 64) {
    throw new Error("Palette must contain 1 to 64 colors.");
  }

  const parsed = palette.map(parseHexRgba);
  const output = new Uint8ClampedArray(pixels);
  const dither = options.dither ?? "none";
  const matrix = options.matrix ?? "bayer4";

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = pixels[offset + 3];
      if (alpha === 0) continue;
      const source: Rgba = [
        pixels[offset],
        pixels[offset + 1],
        pixels[offset + 2],
        alpha,
      ];

      let index: number;
      if (dither === "none" || palette.length === 1) {
        index = nearestPaletteIndex(source, palette);
      } else {
        const nearest = twoNearestPaletteIndices(source, palette);
        if (
          nearest.first === nearest.second ||
          nearest.firstDistance === 0
        ) {
          index = nearest.first;
        } else {
          const total =
            nearest.firstDistance + nearest.secondDistance;
          const secondWeight =
            total === 0 ? 0 : nearest.firstDistance / total;
          index =
            secondWeight > orderedThreshold(matrix, x, y)
              ? nearest.second
              : nearest.first;
        }
      }

      const mapped = parsed[index];
      output[offset] = mapped[0];
      output[offset + 1] = mapped[1];
      output[offset + 2] = mapped[2];
      output[offset + 3] = alpha;
    }
  }
  return output;
}

type PalettePoint = {
  L: number;
  a: number;
  b: number;
};

type PaletteBox = {
  points: PalettePoint[];
};

function boxRange(box: PaletteBox): {
  axis: keyof PalettePoint;
  span: number;
} {
  let bestAxis: keyof PalettePoint = "L";
  let bestSpan = -1;
  for (const axis of ["L", "a", "b"] as const) {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const point of box.points) {
      min = Math.min(min, point[axis]);
      max = Math.max(max, point[axis]);
    }
    const span = max - min;
    if (span > bestSpan) {
      bestSpan = span;
      bestAxis = axis;
    }
  }
  return { axis: bestAxis, span: bestSpan };
}

function averageBox(box: PaletteBox): Oklab {
  const sum = box.points.reduce(
    (acc, point) => ({
      L: acc.L + point.L,
      a: acc.a + point.a,
      b: acc.b + point.b,
    }),
    { L: 0, a: 0, b: 0 }
  );
  const count = Math.max(1, box.points.length);
  return {
    L: sum.L / count,
    a: sum.a / count,
    b: sum.b / count,
  };
}

export function extractPaletteMedianCut(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  paletteSize: number,
  options: PaletteExtractionOptions = {}
): string[] {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    pixels.byteLength !== width * height * 4
  ) {
    throw new Error("Palette extraction requires a valid RGBA bitmap.");
  }
  if (!Number.isInteger(paletteSize) || paletteSize < 1 || paletteSize > 32) {
    throw new Error("Palette size must be an integer from 1 to 32.");
  }

  const maxSamples = options.maxSamples ?? 4096;
  const alphaThreshold = options.alphaThreshold ?? 8;
  if (!Number.isInteger(maxSamples) || maxSamples <= 0) {
    throw new Error("maxSamples must be a positive integer.");
  }

  const pixelCount = width * height;
  const stride = Math.max(1, Math.ceil(pixelCount / maxSamples));
  const points: PalettePoint[] = [];
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += stride) {
    const offset = pixelIndex * 4;
    const alpha = pixels[offset + 3];
    if (alpha < alphaThreshold) continue;
    const lab = rgbaToOklab([
      pixels[offset],
      pixels[offset + 1],
      pixels[offset + 2],
      alpha,
    ]);
    points.push(lab);
  }
  if (points.length === 0) return [];

  const boxes: PaletteBox[] = [{ points }];
  while (boxes.length < paletteSize) {
    let bestIndex = -1;
    let bestScore = -1;
    let bestAxis: keyof PalettePoint = "L";

    for (let index = 0; index < boxes.length; index += 1) {
      const box = boxes[index];
      if (box.points.length < 2) continue;
      const range = boxRange(box);
      const score = range.span * box.points.length;
      if (score > bestScore) {
        bestIndex = index;
        bestScore = score;
        bestAxis = range.axis;
      }
    }
    if (bestIndex < 0) break;

    const [box] = boxes.splice(bestIndex, 1);
    box.points.sort((left, right) => left[bestAxis] - right[bestAxis]);
    const middle = Math.floor(box.points.length / 2);
    boxes.push(
      { points: box.points.slice(0, middle) },
      { points: box.points.slice(middle) }
    );
  }

  return boxes
    .filter((box) => box.points.length > 0)
    .map(averageBox)
    .sort((left, right) => left.L - right.L)
    .map((lab) => rgbaToHex(oklabToRgba(lab)));
}
