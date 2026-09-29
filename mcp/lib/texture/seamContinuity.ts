export type TextureSeamRgba = [number, number, number, number];

export type TextureSeamEdgeInput = {
  cube_uuid: string;
  cube_name: string;
  face: string;
  edge: "left" | "right" | "top" | "bottom";
  start: [number, number, number];
  end: [number, number, number];
  samples: TextureSeamRgba[];
};

export const TEXTURE_SEAM_EXAMPLE_LIMIT = 6;
const POSITION_QUANTIZATION = 100_000;

function ratio(value: number, total: number): number {
  return total === 0 ? 0 : Number((value / total).toFixed(4));
}

function requireEdge(edge: TextureSeamEdgeInput): void {
  if (
    edge.samples.length === 0 ||
    edge.samples.some(
      (sample) =>
        sample.length !== 4 ||
        sample.some((value) => !Number.isFinite(value) || value < 0 || value > 255)
    )
  ) {
    throw new Error("Texture seam edge samples must contain finite RGBA bytes.");
  }
  if ([...edge.start, ...edge.end].some((value) => !Number.isFinite(value))) {
    throw new Error("Texture seam edge endpoints must be finite 3D coordinates.");
  }
}

function pointKey(point: readonly number[]): string {
  return point
    .map((value) => Math.round(value * POSITION_QUANTIZATION))
    .join(",");
}

function canonicalEdgeKey(edge: TextureSeamEdgeInput): string {
  const start = pointKey(edge.start);
  const end = pointKey(edge.end);
  return start < end
    ? `${edge.cube_uuid}|${start}|${end}`
    : `${edge.cube_uuid}|${end}|${start}`;
}

function squaredDistance(a: readonly number[], b: readonly number[]): number {
  return (
    (a[0] - b[0]) ** 2 +
    (a[1] - b[1]) ** 2 +
    (a[2] - b[2]) ** 2
  );
}

function normalizedRgbDifference(
  left: TextureSeamRgba,
  right: TextureSeamRgba
): number {
  const distance = Math.sqrt(
    (left[0] - right[0]) ** 2 +
    (left[1] - right[1]) ** 2 +
    (left[2] - right[2]) ** 2
  );
  return distance / Math.sqrt(3 * 255 ** 2);
}

function alignedSamples(
  left: TextureSeamEdgeInput,
  right: TextureSeamEdgeInput
): { left: TextureSeamRgba[]; right: TextureSeamRgba[] } {
  const reverse =
    squaredDistance(left.start, right.end) +
      squaredDistance(left.end, right.start) <
    squaredDistance(left.start, right.start) +
      squaredDistance(left.end, right.end);

  const rightSamples = reverse ? [...right.samples].reverse() : right.samples;
  const count = Math.min(left.samples.length, rightSamples.length);
  if (count <= 0) return { left: [], right: [] };

  const sampleAt = (samples: readonly TextureSeamRgba[], index: number) => {
    if (count === 1) return samples[Math.floor(samples.length / 2)];
    const normalized = index / (count - 1);
    return samples[
      Math.min(
        samples.length - 1,
        Math.round(normalized * (samples.length - 1))
      )
    ];
  };

  return {
    left: Array.from({ length: count }, (_, index) => sampleAt(left.samples, index)),
    right: Array.from({ length: count }, (_, index) => sampleAt(rightSamples, index)),
  };
}

function seamSummary(
  left: TextureSeamEdgeInput,
  right: TextureSeamEdgeInput
) {
  const aligned = alignedSamples(left, right);
  let rgbSum = 0;
  let rgbMax = 0;
  let alphaSum = 0;
  let alphaMax = 0;
  let visiblePairs = 0;

  for (let index = 0; index < aligned.left.length; index += 1) {
    const a = aligned.left[index];
    const b = aligned.right[index];
    const rgb = normalizedRgbDifference(a, b);
    const alpha = Math.abs(a[3] - b[3]) / 255;
    rgbSum += rgb;
    rgbMax = Math.max(rgbMax, rgb);
    alphaSum += alpha;
    alphaMax = Math.max(alphaMax, alpha);
    if (a[3] > 0 || b[3] > 0) visiblePairs += 1;
  }

  const count = aligned.left.length;
  const meanRgb = count === 0 ? 0 : rgbSum / count;
  const meanAlpha = count === 0 ? 0 : alphaSum / count;

  return {
    cube_uuid: left.cube_uuid,
    cube_name: left.cube_name,
    faces: [
      { face: left.face, edge: left.edge },
      { face: right.face, edge: right.edge },
    ],
    sample_count: count,
    visible_pair_ratio: ratio(visiblePairs, count),
    mean_rgb_difference: Number(meanRgb.toFixed(4)),
    max_rgb_difference: Number(rgbMax.toFixed(4)),
    mean_alpha_difference: Number(meanAlpha.toFixed(4)),
    max_alpha_difference: Number(alphaMax.toFixed(4)),
    high_contrast: meanRgb >= 0.4,
    alpha_discontinuity: alphaMax >= 0.5,
  };
}

export function analyzeTextureSeamContinuity(
  edges: readonly TextureSeamEdgeInput[],
  exampleLimit = TEXTURE_SEAM_EXAMPLE_LIMIT
) {
  for (const edge of edges) requireEdge(edge);

  const groups = new Map<string, TextureSeamEdgeInput[]>();
  for (const edge of edges) {
    const key = canonicalEdgeKey(edge);
    const group = groups.get(key) ?? [];
    group.push(edge);
    groups.set(key, group);
  }

  const paired = [...groups.values()]
    .filter((group) => group.length === 2 && group[0].face !== group[1].face)
    .map((group) => seamSummary(group[0], group[1]))
    .sort(
      (a, b) =>
        b.mean_rgb_difference - a.mean_rgb_difference ||
        b.mean_alpha_difference - a.mean_alpha_difference
    );
  const unpaired = [...groups.values()].filter((group) => group.length === 1);
  const ambiguous = [...groups.values()].filter((group) => group.length > 2);
  const review = paired.filter(
    (seam) => seam.high_contrast || seam.alpha_discontinuity
  );

  return {
    state: edges.length === 0 ? ("not_applicable" as const) : ("available" as const),
    scope: "intra_cube" as const,
    cross_cube_continuity: "not_evaluated" as const,
    sampled_edge_count: edges.length,
    paired_seam_count: paired.length,
    unpaired_edge_count: unpaired.length,
    ambiguous_edge_count: ambiguous.length,
    review: {
      candidate_count: review.length,
      high_contrast_count: review.filter((seam) => seam.high_contrast).length,
      alpha_discontinuity_count: review.filter((seam) => seam.alpha_discontinuity).length,
      examples: review.slice(0, exampleLimit),
      examples_truncated: review.length > exampleLimit,
    },
    ranked_examples: paired.slice(0, exampleLimit),
    ranked_examples_truncated: paired.length > exampleLimit,
    gate: {
      state: "advisory" as const,
      reasons: review.length > 0 ? ["SEAM_CONTINUITY_REVIEW"] : [],
    },
    note:
      "Only face edges within the same Cube are paired; cross-Cube continuity is not evaluated. Seam contrast is advisory evidence, not a style score or automatic failure. Intentional face lighting/material boundaries may differ; inspect ranked candidates against the approved reference.",
  };
}
