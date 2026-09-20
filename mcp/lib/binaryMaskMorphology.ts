export type BinaryMaskMorphologyMode = "expand" | "contract";

const INF = Number.POSITIVE_INFINITY;

function squaredDistanceTransform1d(values: Float64Array): Float64Array {
  const n = values.length;
  const output = new Float64Array(n);
  output.fill(INF);

  const finite: number[] = [];
  for (let index = 0; index < n; index += 1) {
    if (Number.isFinite(values[index])) finite.push(index);
  }
  if (finite.length === 0) return output;

  const sites = new Int32Array(finite.length);
  const boundaries = new Float64Array(finite.length + 1);
  let k = 0;
  sites[0] = finite[0];
  boundaries[0] = -INF;
  boundaries[1] = INF;

  for (let fi = 1; fi < finite.length; fi += 1) {
    const q = finite[fi];
    let intersection = 0;

    while (true) {
      const p = sites[k];
      intersection =
        ((values[q] + q * q) - (values[p] + p * p)) /
        (2 * (q - p));
      if (intersection > boundaries[k] || k === 0) break;
      k -= 1;
    }

    if (k === 0 && intersection <= boundaries[k]) {
      sites[0] = q;
      boundaries[0] = -INF;
      boundaries[1] = INF;
      continue;
    }

    k += 1;
    sites[k] = q;
    boundaries[k] = intersection;
    boundaries[k + 1] = INF;
  }

  k = 0;
  for (let q = 0; q < n; q += 1) {
    while (boundaries[k + 1] < q) k += 1;
    const p = sites[k];
    const delta = q - p;
    output[q] = delta * delta + values[p];
  }

  return output;
}

function squaredDistanceToValue(
  mask: Uint8Array | Int8Array,
  width: number,
  height: number,
  target: 0 | 1
): Float64Array {
  const horizontal = new Float64Array(width * height);
  const row = new Float64Array(width);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      row[x] = mask[y * width + x] === target ? 0 : INF;
    }
    const transformed = squaredDistanceTransform1d(row);
    horizontal.set(transformed, y * width);
  }

  const result = new Float64Array(width * height);
  const column = new Float64Array(height);
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      column[y] = horizontal[y * width + x];
    }
    const transformed = squaredDistanceTransform1d(column);
    for (let y = 0; y < height; y += 1) {
      result[y * width + x] = transformed[y];
    }
  }
  return result;
}

function squaredDistanceToOutside(
  x: number,
  y: number,
  width: number,
  height: number
): number {
  const left = x + 1;
  const right = width - x;
  const top = y + 1;
  const bottom = height - y;
  const distance = Math.min(left, right, top, bottom);
  return distance * distance;
}

function requireMask(
  mask: Uint8Array | Int8Array,
  width: number,
  height: number,
  radius: number
): void {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    mask.length !== width * height
  ) {
    throw new Error("Binary mask dimensions are invalid.");
  }
  if (!Number.isSafeInteger(radius) || radius < 0) {
    throw new Error("Binary mask morphology radius must be a non-negative integer.");
  }
}

/**
 * Exact circular binary dilation/erosion matching Blockbench's round selection
 * semantics, but without the per-pixel radius² neighborhood scan.
 *
 * expand: selected if nearest selected source pixel is within radius.
 * contract: selected only if nearest unselected source pixel (including the
 * lattice immediately outside the bitmap) is farther than radius.
 */
export function morphBinaryMaskRound(
  mask: Uint8Array | Int8Array,
  width: number,
  height: number,
  radius: number,
  mode: BinaryMaskMorphologyMode
): Int8Array {
  requireMask(mask, width, height, radius);
  const source = new Int8Array(mask.length);
  for (let index = 0; index < mask.length; index += 1) {
    source[index] = mask[index] ? 1 : 0;
  }
  if (radius === 0) return source;

  const target: 0 | 1 = mode === "expand" ? 1 : 0;
  const distances = squaredDistanceToValue(source, width, height, target);
  const radiusSquared = radius * radius;
  const output = new Int8Array(source);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (mode === "expand") {
        if (source[index] === 0 && distances[index] <= radiusSquared) {
          output[index] = 1;
        }
        continue;
      }

      if (source[index] === 1) {
        const nearestZero = Math.min(
          distances[index],
          squaredDistanceToOutside(x, y, width, height)
        );
        if (nearestZero <= radiusSquared) output[index] = 0;
      }
    }
  }
  return output;
}
