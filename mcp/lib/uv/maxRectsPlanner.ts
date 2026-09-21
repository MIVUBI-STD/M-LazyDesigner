export type AtlasRectInput = {
  id: string;
  width: number;
  height: number;
  allow_rotation?: boolean;
  cohort?: string;
};

export type AtlasPlacement = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  cohort?: string;
};

export type ReservedAtlasRect = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AtlasPackOptions = {
  width: number;
  height: number;
  padding?: number;
  allow_rotation?: boolean;
  reserved_rects?: readonly ReservedAtlasRect[];
};

type Rect = { x: number; y: number; width: number; height: number };

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error(label + " must be a positive integer.");
  return value;
}

function nonNegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) throw new Error(label + " must be a non-negative integer.");
  return value;
}

function intersects(a: Rect, b: Rect): boolean {
  return !(b.x >= a.x + a.width || b.x + b.width <= a.x || b.y >= a.y + a.height || b.y + b.height <= a.y);
}

function contains(a: Rect, b: Rect): boolean {
  return b.x >= a.x && b.y >= a.y && b.x + b.width <= a.x + a.width && b.y + b.height <= a.y + a.height;
}

function splitFreeRect(free: Rect, used: Rect): Rect[] {
  if (!intersects(free, used)) return [free];
  const out: Rect[] = [];
  if (used.x > free.x) out.push({ x: free.x, y: free.y, width: used.x - free.x, height: free.height });
  if (used.x + used.width < free.x + free.width) out.push({ x: used.x + used.width, y: free.y, width: free.x + free.width - (used.x + used.width), height: free.height });
  if (used.y > free.y) out.push({ x: free.x, y: free.y, width: free.width, height: used.y - free.y });
  if (used.y + used.height < free.y + free.height) out.push({ x: free.x, y: used.y + used.height, width: free.width, height: free.y + free.height - (used.y + used.height) });
  return out.filter((rect) => rect.width > 0 && rect.height > 0);
}

function prune(rects: Rect[]): Rect[] {
  return rects.filter((rect, index) => !rects.some((other, otherIndex) => index !== otherIndex && contains(other, rect)));
}

function scoreLess(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] < b[i]) return true;
    if (a[i] > b[i]) return false;
  }
  return false;
}

export function packAtlasRects(inputs: readonly AtlasRectInput[], options: AtlasPackOptions) {
  const width = positiveInteger(options.width, "Atlas width");
  const height = positiveInteger(options.height, "Atlas height");
  const padding = options.padding ?? 0;
  if (!Number.isInteger(padding) || padding < 0) throw new Error("Atlas padding must be a non-negative integer.");
  const seen = new Set<string>();
  const normalized = inputs.map((input) => {
    if (!input.id || seen.has(input.id)) throw new Error("Atlas rectangle IDs must be non-empty and unique.");
    seen.add(input.id);
    return {
      ...input,
      width: positiveInteger(input.width, "Rectangle " + input.id + " width"),
      height: positiveInteger(input.height, "Rectangle " + input.id + " height"),
    };
  }).sort((a, b) =>
    Math.max(b.width, b.height) - Math.max(a.width, a.height) ||
    b.width * b.height - a.width * a.height ||
    a.id.localeCompare(b.id)
  );

  let freeRects: Rect[] = [{ x: 0, y: 0, width, height }];
  const reserved = (options.reserved_rects ?? []).map((rect) => {
    if (!rect.id) throw new Error("Reserved atlas rectangles require non-empty IDs.");
    const normalizedRect = {
      id: rect.id,
      x: nonNegativeInteger(rect.x, "Reserved " + rect.id + " x"),
      y: nonNegativeInteger(rect.y, "Reserved " + rect.id + " y"),
      width: positiveInteger(rect.width, "Reserved " + rect.id + " width"),
      height: positiveInteger(rect.height, "Reserved " + rect.id + " height"),
    };
    if (normalizedRect.x + normalizedRect.width > width || normalizedRect.y + normalizedRect.height > height) {
      throw new Error("Reserved atlas rectangle " + rect.id + " exceeds the atlas bounds.");
    }
    return normalizedRect;
  });
  for (let i = 0; i < reserved.length; i += 1) {
    for (let j = i + 1; j < reserved.length; j += 1) {
      if (intersects(reserved[i], reserved[j])) throw new Error("Reserved atlas rectangles overlap: " + reserved[i].id + " and " + reserved[j].id + ".");
    }
    freeRects = prune(freeRects.flatMap((free) => splitFreeRect(free, reserved[i])));
  }

  const placements: AtlasPlacement[] = [];
  const unplaced: string[] = [];
  let placedFootprintArea = 0;

  for (const input of normalized) {
    const orientations = [{ width: input.width, height: input.height, rotated: false }];
    if ((options.allow_rotation ?? false) && input.allow_rotation !== false && input.width !== input.height) {
      orientations.push({ width: input.height, height: input.width, rotated: true });
    }
    let best: { used: Rect; contentWidth: number; contentHeight: number; rotated: boolean; score: [number, number, number, number] } | null = null;
    for (const free of freeRects) {
      for (const orientation of orientations) {
        const packedWidth = orientation.width + padding * 2;
        const packedHeight = orientation.height + padding * 2;
        if (packedWidth > free.width || packedHeight > free.height) continue;
        const score: [number, number, number, number] = [
          Math.min(free.width - packedWidth, free.height - packedHeight),
          Math.max(free.width - packedWidth, free.height - packedHeight),
          free.y,
          free.x,
        ];
        if (!best || scoreLess(score, best.score)) {
          best = {
            used: { x: free.x, y: free.y, width: packedWidth, height: packedHeight },
            contentWidth: orientation.width,
            contentHeight: orientation.height,
            rotated: orientation.rotated,
            score,
          };
        }
      }
    }
    if (!best) {
      unplaced.push(input.id);
      continue;
    }
    freeRects = prune(freeRects.flatMap((free) => splitFreeRect(free, best!.used)));
    placedFootprintArea += best.used.width * best.used.height;
    placements.push({
      id: input.id,
      x: best.used.x + padding,
      y: best.used.y + padding,
      width: best.contentWidth,
      height: best.contentHeight,
      rotated: best.rotated,
      cohort: input.cohort,
    });
  }

  const contentArea = placements.reduce((sum, placement) => sum + placement.width * placement.height, 0);
  const reservedArea = reserved.reduce((sum, rect) => sum + rect.width * rect.height, 0);
  return {
    width,
    height,
    padding,
    placements,
    reserved,
    unplaced,
    utilization: (placedFootprintArea + reservedArea) / (width * height),
    content_utilization: contentArea / (width * height),
    complete: unplaced.length === 0,
  };
}
