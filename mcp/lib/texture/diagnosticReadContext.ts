/// <reference types="blockbench-types" />

type DiagnosticInvocationContext = {
  reportProgress: (progress: { progress: number; total: number }) => void;
};

type DiagnosticRegionRead = {
  pixels: Uint8ClampedArray;
  cache_hit: boolean;
};

export const TEXTURE_DIAGNOSTIC_NATIVE_PIXEL_BUDGET = 65_536;

export class TextureDiagnosticBudgetExceededError extends Error {
  constructor(requestedPixels: number, consumedPixels: number) {
    super(
      `Texture diagnostic native-pixel budget exceeded: requested ${requestedPixels}, consumed ${consumedPixels}, limit ${TEXTURE_DIAGNOSTIC_NATIVE_PIXEL_BUDGET}.`
    );
    this.name = "TextureDiagnosticBudgetExceededError";
  }
}

type DiagnosticMetrics = {
  read_calls: number;
  cache_hits: number;
  pixels_read: number;
  bytes_read: number;
  cached_regions: number;
  cached_samples: number;
  pixel_budget: number;
};

type CachedRegion = {
  texture_uuid: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
};

type DiagnosticReadState = {
  regions: Map<string, CachedRegion>;
  samples: Map<string, Uint8ClampedArray>;
  metrics: Omit<
    DiagnosticMetrics,
    "cached_regions" | "cached_samples" | "pixel_budget"
  >;
};

const contexts = new WeakMap<object, DiagnosticReadState>();

function contextObject(context: unknown): object | null {
  return context && (typeof context === "object" || typeof context === "function")
    ? (context as object)
    : null;
}

function stateFor(context: object): DiagnosticReadState {
  let state = contexts.get(context);
  if (!state) {
    state = {
      regions: new Map(),
      samples: new Map(),
      metrics: {
        read_calls: 0,
        cache_hits: 0,
        pixels_read: 0,
        bytes_read: 0,
      },
    };
    contexts.set(context, state);
  }
  return state;
}


function requireDiagnosticPixelBudget(
  state: DiagnosticReadState,
  requestedPixels: number
): void {
  if (
    state.metrics.pixels_read + requestedPixels >
    TEXTURE_DIAGNOSTIC_NATIVE_PIXEL_BUDGET
  ) {
    throw new TextureDiagnosticBudgetExceededError(
      requestedPixels,
      state.metrics.pixels_read
    );
  }
}

export function isTextureDiagnosticBudgetExceeded(
  error: unknown
): error is TextureDiagnosticBudgetExceededError {
  return error instanceof TextureDiagnosticBudgetExceededError;
}

function cropCachedRegion(
  region: CachedRegion,
  x: number,
  y: number,
  width: number,
  height: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4);
  const offsetX = x - region.x;
  const offsetY = y - region.y;
  for (let row = 0; row < height; row += 1) {
    const sourceStart =
      ((offsetY + row) * region.width + offsetX) * 4;
    const sourceEnd = sourceStart + width * 4;
    out.set(
      region.pixels.subarray(sourceStart, sourceEnd),
      row * width * 4
    );
  }
  return out;
}

function containingRegion(
  state: DiagnosticReadState,
  texture: Texture,
  x: number,
  y: number,
  width: number,
  height: number
): CachedRegion | null {
  const right = x + width;
  const bottom = y + height;
  for (const region of state.regions.values()) {
    if (
      region.texture_uuid === texture.uuid &&
      x >= region.x &&
      y >= region.y &&
      right <= region.x + region.width &&
      bottom <= region.y + region.height
    ) {
      return region;
    }
  }
  return null;
}

function regionKey(
  texture: Texture,
  x: number,
  y: number,
  width: number,
  height: number
): string {
  return [texture.uuid, x, y, width, height].join(":");
}

/**
 * Guarantees one object identity that nested texture diagnostic wrappers can
 * pass through the same MCP invocation. No state survives once that invocation
 * context becomes unreachable.
 */
export function ensureTextureDiagnosticInvocationContext(
  context: unknown
): DiagnosticInvocationContext {
  const candidate = contextObject(context) as
    | (DiagnosticInvocationContext & object)
    | null;
  if (
    candidate &&
    typeof candidate.reportProgress === "function"
  ) {
    return candidate;
  }
  return { reportProgress: () => {} };
}

export function hasTextureDiagnosticRegion(
  context: unknown,
  texture: Texture,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  const keyContext = contextObject(context);
  if (!keyContext) return false;
  const state = stateFor(keyContext);
  return (
    state.regions.has(regionKey(texture, x, y, width, height)) ||
    containingRegion(state, texture, x, y, width, height) !== null
  );
}

export function readTextureDiagnosticRegion(
  context: unknown,
  texture: Texture,
  x: number,
  y: number,
  width: number,
  height: number
): DiagnosticRegionRead {
  const keyContext = contextObject(context);
  if (!keyContext) {
    const pixels = new Uint8ClampedArray(
      texture.ctx.getImageData(x, y, width, height).data
    );
    return { pixels, cache_hit: false };
  }

  const state = stateFor(keyContext);
  const key = regionKey(texture, x, y, width, height);
  const exact = state.regions.get(key);
  if (exact) {
    state.metrics.cache_hits += 1;
    return { pixels: exact.pixels, cache_hit: true };
  }

  const parent = containingRegion(state, texture, x, y, width, height);
  if (parent) {
    state.metrics.cache_hits += 1;
    return {
      pixels: cropCachedRegion(parent, x, y, width, height),
      cache_hit: true,
    };
  }

  requireDiagnosticPixelBudget(state, width * height);
  const pixels = new Uint8ClampedArray(
    texture.ctx.getImageData(x, y, width, height).data
  );
  state.regions.set(key, {
    texture_uuid: texture.uuid,
    x,
    y,
    width,
    height,
    pixels,
  });
  state.metrics.read_calls += 1;
  state.metrics.pixels_read += width * height;
  state.metrics.bytes_read += pixels.byteLength;
  return { pixels, cache_hit: false };
}

export function readTextureDiagnosticSample(
  context: unknown,
  texture: Texture,
  width: number,
  height: number,
  producer: () => Uint8ClampedArray
): DiagnosticRegionRead {
  const keyContext = contextObject(context);
  if (!keyContext) {
    return { pixels: producer(), cache_hit: false };
  }

  const state = stateFor(keyContext);
  const key = [texture.uuid, "sample", width, height].join(":");
  const cached = state.samples.get(key);
  if (cached) {
    state.metrics.cache_hits += 1;
    return { pixels: cached, cache_hit: true };
  }

  requireDiagnosticPixelBudget(state, width * height);
  const pixels = producer();
  if (pixels.byteLength !== width * height * 4) {
    throw new Error(
      `Texture diagnostic sample length mismatch for "${texture.name}".`
    );
  }
  state.samples.set(key, pixels);
  state.metrics.read_calls += 1;
  state.metrics.pixels_read += width * height;
  state.metrics.bytes_read += pixels.byteLength;
  return { pixels, cache_hit: false };
}

export function textureDiagnosticReadMetrics(
  context: unknown
): DiagnosticMetrics | null {
  const keyContext = contextObject(context);
  if (!keyContext) return null;
  const state = stateFor(keyContext);
  return {
    ...state.metrics,
    cached_regions: state.regions.size,
    cached_samples: state.samples.size,
    pixel_budget: TEXTURE_DIAGNOSTIC_NATIVE_PIXEL_BUDGET,
  };
}
