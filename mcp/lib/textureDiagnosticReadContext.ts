/// <reference types="blockbench-types" />

type DiagnosticRegionRead = {
  pixels: Uint8ClampedArray;
  cache_hit: boolean;
};

type DiagnosticMetrics = {
  read_calls: number;
  cache_hits: number;
  pixels_read: number;
  bytes_read: number;
  cached_regions: number;
};

type DiagnosticReadState = {
  regions: Map<string, Uint8ClampedArray>;
  metrics: Omit<DiagnosticMetrics, "cached_regions">;
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
): object {
  return contextObject(context) ?? {};
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
  return stateFor(keyContext).regions.has(
    regionKey(texture, x, y, width, height)
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
  const cached = state.regions.get(key);
  if (cached) {
    state.metrics.cache_hits += 1;
    return { pixels: cached, cache_hit: true };
  }

  const pixels = new Uint8ClampedArray(
    texture.ctx.getImageData(x, y, width, height).data
  );
  state.regions.set(key, pixels);
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
  };
}
