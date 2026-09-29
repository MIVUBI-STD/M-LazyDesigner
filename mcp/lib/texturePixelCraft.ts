export const TEXTURE_PIXEL_CRAFT_MAX_PIXELS = 16_384;
export const TEXTURE_PIXEL_CRAFT_EXAMPLE_LIMIT = 8;

export type TexturePixelCraftOptions = {
  maxPixels?: number;
  exampleLimit?: number;
};

type Pixel = {
  r: number;
  g: number;
  b: number;
  a: number;
};

function ratio(value: number, total: number): number {
  return total === 0 ? 0 : Number((value / total).toFixed(4));
}

function bucketKey(pixel: Pixel): number {
  return (
    ((pixel.r >> 5) << 6) |
    ((pixel.g >> 5) << 3) |
    (pixel.b >> 5)
  );
}

function pixelAt(
  rgba: ArrayLike<number>,
  width: number,
  x: number,
  y: number
): Pixel {
  const offset = (y * width + x) * 4;
  return {
    r: Number(rgba[offset]),
    g: Number(rgba[offset + 1]),
    b: Number(rgba[offset + 2]),
    a: Number(rgba[offset + 3]),
  };
}

function visible(pixel: Pixel): boolean {
  return pixel.a > 0;
}

const NEIGHBORS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

/**
 * Exact bounded pixel-cluster evidence for Minecraft texture craft.
 *
 * This is deliberately not a style score. It surfaces fragmentation,
 * isolated pixels, color-transition density and alpha-boundary complexity so
 * Codex can compare them against the approved reference/material intent.
 */
export function analyzeTexturePixelCraft(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  options: TexturePixelCraftOptions = {}
) {
  if (
    !Number.isInteger(width) ||
    width <= 0 ||
    !Number.isInteger(height) ||
    height <= 0
  ) {
    throw new Error(
      "Texture pixel craft requires positive integer dimensions."
    );
  }
  const totalPixels = width * height;
  if (!Number.isSafeInteger(totalPixels) || rgba.length < totalPixels * 4) {
    throw new Error(
      "Texture pixel craft pixel buffer is smaller than the declared dimensions."
    );
  }

  const maxPixels = options.maxPixels ?? TEXTURE_PIXEL_CRAFT_MAX_PIXELS;
  const exampleLimit =
    options.exampleLimit ?? TEXTURE_PIXEL_CRAFT_EXAMPLE_LIMIT;
  if (!Number.isInteger(maxPixels) || maxPixels < 1) {
    throw new Error("Texture pixel craft maxPixels must be positive.");
  }
  if (
    !Number.isInteger(exampleLimit) ||
    exampleLimit < 1 ||
    exampleLimit > 100
  ) {
    throw new Error("Texture pixel craft exampleLimit must be 1..100.");
  }

  if (totalPixels > maxPixels) {
    return {
      state: "unavailable" as const,
      reason: "region_too_large_for_exact_pixel_craft" as const,
      bitmap: { width, height, total_pixels: totalPixels },
      max_pixels: maxPixels,
      suggested_action:
        "Request a focused get_texture region around the material/identity area under review.",
    };
  }

  const bucket = new Int32Array(totalPixels);
  bucket.fill(-1);
  const isVisible = new Uint8Array(totalPixels);
  let visibleCount = 0;
  let isolatedVisibleCount = 0;
  let alphaBoundaryEdges = 0;
  let visibleAdjacencyPairs = 0;
  let colorTransitionPairs = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const pixel = pixelAt(rgba, width, x, y);
      if (!visible(pixel)) continue;
      isVisible[index] = 1;
      bucket[index] = bucketKey(pixel);
      visibleCount += 1;
    }
  }

  const isolatedExamples: Array<{ x: number; y: number }> = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!isVisible[index]) continue;

      let visibleNeighbors = 0;
      for (const [dx, dy] of NEIGHBORS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          alphaBoundaryEdges += 1;
          continue;
        }
        const neighborIndex = ny * width + nx;
        if (!isVisible[neighborIndex]) {
          alphaBoundaryEdges += 1;
          continue;
        }
        visibleNeighbors += 1;
      }

      if (visibleNeighbors === 0) {
        isolatedVisibleCount += 1;
        if (isolatedExamples.length < exampleLimit) {
          isolatedExamples.push({ x, y });
        }
      }

      // Count right/down only so visible adjacency is not double-counted.
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= width || ny >= height) continue;
        const neighborIndex = ny * width + nx;
        if (!isVisible[neighborIndex]) continue;
        visibleAdjacencyPairs += 1;
        if (bucket[index] !== bucket[neighborIndex]) {
          colorTransitionPairs += 1;
        }
      }
    }
  }

  const visited = new Uint8Array(totalPixels);
  let componentCount = 0;
  let tinyComponentCount = 0;
  let tinyComponentPixels = 0;
  let largestComponentPixels = 0;
  const tinyExamples: Array<{
    bucket: number;
    size: number;
    x: number;
    y: number;
  }> = [];

  for (let start = 0; start < totalPixels; start += 1) {
    if (!isVisible[start] || visited[start]) continue;
    componentCount += 1;
    const targetBucket = bucket[start];
    const stack = [start];
    visited[start] = 1;
    let size = 0;
    const startX = start % width;
    const startY = Math.floor(start / width);

    while (stack.length > 0) {
      const index = stack.pop()!;
      size += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      for (const [dx, dy] of NEIGHBORS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const neighbor = ny * width + nx;
        if (
          visited[neighbor] ||
          !isVisible[neighbor] ||
          bucket[neighbor] !== targetBucket
        ) {
          continue;
        }
        visited[neighbor] = 1;
        stack.push(neighbor);
      }
    }

    largestComponentPixels = Math.max(largestComponentPixels, size);
    if (size <= 2) {
      tinyComponentCount += 1;
      tinyComponentPixels += size;
      if (tinyExamples.length < exampleLimit) {
        tinyExamples.push({
          bucket: targetBucket,
          size,
          x: startX,
          y: startY,
        });
      }
    }
  }

  const fragmentationRatio = ratio(tinyComponentPixels, visibleCount);
  const transitionRatio = ratio(
    colorTransitionPairs,
    visibleAdjacencyPairs
  );
  const alphaBoundaryDensity = ratio(alphaBoundaryEdges, visibleCount);

  const reviewHints: string[] = [];
  if (fragmentationRatio >= 0.25) {
    reviewHints.push("HIGH_TINY_CLUSTER_FRAGMENTATION");
  }
  if (transitionRatio >= 0.65 && visibleAdjacencyPairs >= 8) {
    reviewHints.push("HIGH_LOCAL_COLOR_TRANSITION_DENSITY");
  }
  if (ratio(isolatedVisibleCount, visibleCount) >= 0.1) {
    reviewHints.push("HIGH_ISOLATED_VISIBLE_PIXEL_RATIO");
  }

  return {
    state: "available" as const,
    visual_verdict: "not_evaluated" as const,
    bitmap: {
      width,
      height,
      total_pixels: totalPixels,
      visible_pixels: visibleCount,
    },
    isolation: {
      isolated_visible_pixel_count: isolatedVisibleCount,
      isolated_visible_ratio: ratio(isolatedVisibleCount, visibleCount),
      examples: isolatedExamples,
      examples_truncated: isolatedVisibleCount > isolatedExamples.length,
    },
    color_clusters: {
      component_count: componentCount,
      tiny_component_count: tinyComponentCount,
      tiny_component_pixel_count: tinyComponentPixels,
      tiny_component_visible_ratio: fragmentationRatio,
      largest_component_visible_ratio: ratio(
        largestComponentPixels,
        visibleCount
      ),
      examples: tinyExamples,
      examples_truncated: tinyComponentCount > tinyExamples.length,
    },
    local_transitions: {
      visible_adjacency_pair_count: visibleAdjacencyPairs,
      quantized_color_transition_pair_count: colorTransitionPairs,
      quantized_color_transition_ratio: transitionRatio,
    },
    alpha_boundary: {
      edge_count: alphaBoundaryEdges,
      edges_per_visible_pixel: alphaBoundaryDensity,
    },
    review_hints: reviewHints,
    note:
      "Pixel-cluster diagnostics are reference-dependent craft evidence, not a style verdict. Fragmentation, isolated pixels, color transitions and alpha-edge complexity can be intentional identity detail. Compare only against the approved material/marking intent before correcting.",
  };
}
