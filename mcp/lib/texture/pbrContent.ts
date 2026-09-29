export type PbrContentChannel = "normal" | "height" | "mer";

export type PbrContentTextureInput = {
  uuid: string;
  name: string;
  channel: PbrContentChannel;
  pixels: Uint8ClampedArray;
  mers_enabled?: boolean;
};

export const PBR_CONTENT_EXAMPLE_LIMIT = 6;

function ratio(value: number, total: number): number {
  return total === 0 ? 0 : Number((value / total).toFixed(4));
}

function requireTexture(input: PbrContentTextureInput): void {
  if (input.pixels.length === 0 || input.pixels.length % 4 !== 0) {
    throw new Error("PBR content analysis requires a non-empty RGBA pixel buffer.");
  }
}

function baseSummary(input: PbrContentTextureInput, sampled: number) {
  return {
    uuid: input.uuid,
    name: input.name,
    channel: input.channel,
    sampled_pixels: sampled,
  };
}

function analyzeNormal(input: PbrContentTextureInput) {
  let visible = 0;
  let grayscale = 0;
  let suspiciousVector = 0;
  let blueSum = 0;
  let vectorLengthSum = 0;

  for (let offset = 0; offset < input.pixels.length; offset += 4) {
    const r = input.pixels[offset];
    const g = input.pixels[offset + 1];
    const b = input.pixels[offset + 2];
    visible += 1;
    if (Math.max(r, g, b) - Math.min(r, g, b) <= 4) grayscale += 1;
    const x = (r / 255) * 2 - 1;
    const y = (g / 255) * 2 - 1;
    const z = (b / 255) * 2 - 1;
    const length = Math.sqrt(x * x + y * y + z * z);
    vectorLengthSum += length;
    blueSum += b;
    if (length < 0.5 || length > 1.5) suspiciousVector += 1;
  }

  const grayscaleRatio = ratio(grayscale, visible);
  const suspiciousVectorRatio = ratio(suspiciousVector, visible);
  const reasons: string[] = [];
  if (visible >= 16 && grayscaleRatio >= 0.95) {
    reasons.push("NORMAL_MAP_APPEARS_GRAYSCALE");
  }
  if (visible >= 16 && suspiciousVectorRatio >= 0.25) {
    reasons.push("NORMAL_VECTOR_RANGE_SUSPICIOUS");
  }

  return {
    ...baseSummary(input, input.pixels.length / 4),
    visible_pixels: visible,
    grayscale_ratio: grayscaleRatio,
    mean_blue: visible === 0 ? null : Number((blueSum / visible).toFixed(2)),
    mean_vector_length:
      visible === 0 ? null : Number((vectorLengthSum / visible).toFixed(4)),
    suspicious_vector_ratio: suspiciousVectorRatio,
    reasons,
  };
}

function analyzeHeight(input: PbrContentTextureInput) {
  let visible = 0;
  let divergent = 0;
  let meanSum = 0;
  let min = 255;
  let max = 0;

  for (let offset = 0; offset < input.pixels.length; offset += 4) {
    const r = input.pixels[offset];
    const g = input.pixels[offset + 1];
    const b = input.pixels[offset + 2];
    visible += 1;
    if (Math.max(r, g, b) - Math.min(r, g, b) > 4) divergent += 1;
    const value = Math.round((r + g + b) / 3);
    meanSum += value;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  const divergentRatio = ratio(divergent, visible);
  const reasons: string[] = [];
  if (visible >= 16 && divergentRatio > 0.05) {
    reasons.push("HEIGHT_MAP_NOT_GRAYSCALE");
  }

  return {
    ...baseSummary(input, input.pixels.length / 4),
    visible_pixels: visible,
    channel_divergence_ratio: divergentRatio,
    value_range: visible === 0 ? null : [min, max],
    mean_value: visible === 0 ? null : Number((meanSum / visible).toFixed(2)),
    reasons,
  };
}

function analyzeMer(input: PbrContentTextureInput) {
  let visible = 0;
  let partialMetalness = 0;
  let emissive = 0;
  let roughnessSum = 0;
  let roughnessMin = 255;
  let roughnessMax = 0;
  let subsurface = 0;
  let metalSubsurfaceOverlap = 0;

  for (let offset = 0; offset < input.pixels.length; offset += 4) {
    const r = input.pixels[offset];
    const g = input.pixels[offset + 1];
    const b = input.pixels[offset + 2];
    const a = input.pixels[offset + 3];
    visible += 1;
    if (r > 16 && r < 239) partialMetalness += 1;
    if (g > 0) emissive += 1;
    roughnessSum += b;
    roughnessMin = Math.min(roughnessMin, b);
    roughnessMax = Math.max(roughnessMax, b);
    if (input.mers_enabled && a > 16) {
      subsurface += 1;
      if (r > 16) metalSubsurfaceOverlap += 1;
    }
  }

  const overlapRatio = ratio(metalSubsurfaceOverlap, visible);
  const reasons: string[] = [];
  if (input.mers_enabled && visible >= 16 && overlapRatio > 0.05) {
    reasons.push("MERS_METALNESS_SUBSURFACE_OVERLAP");
  }

  return {
    ...baseSummary(input, input.pixels.length / 4),
    semantic_mode: input.mers_enabled ? ("MERS" as const) : ("MER" as const),
    metalness: {
      partial_ratio: ratio(partialMetalness, visible),
      note:
        "Partial metalness is advisory only; Bedrock permits it although binary metalness is physically preferred.",
    },
    emissive_coverage_ratio: ratio(emissive, visible),
    roughness: {
      range: visible === 0 ? null : [roughnessMin, roughnessMax],
      mean: visible === 0 ? null : Number((roughnessSum / visible).toFixed(2)),
    },
    subsurface: input.mers_enabled
      ? {
          coverage_ratio: ratio(subsurface, visible),
          metalness_overlap_ratio: overlapRatio,
        }
      : null,
    reasons,
  };
}

export function analyzePbrTextureContent(
  textures: readonly PbrContentTextureInput[],
  exampleLimit = PBR_CONTENT_EXAMPLE_LIMIT
) {
  const diagnostics = textures.map((input) => {
    requireTexture(input);
    if (input.channel === "normal") return analyzeNormal(input);
    if (input.channel === "height") return analyzeHeight(input);
    return analyzeMer(input);
  });

  const review = diagnostics.filter((entry) => entry.reasons.length > 0);
  const reasons = [...new Set(review.flatMap((entry) => entry.reasons))].sort();

  return {
    state:
      textures.length === 0 ? ("not_applicable" as const) : ("available" as const),
    texture_count: textures.length,
    review: {
      texture_count: review.length,
      reasons,
      examples: review.slice(0, exampleLimit),
      examples_truncated: review.length > exampleLimit,
    },
    textures: diagnostics.slice(0, exampleLimit),
    textures_truncated: diagnostics.length > exampleLimit,
    gate: {
      state:
        textures.length === 0
          ? ("not_applicable" as const)
          : review.length > 0
            ? ("review_required" as const)
            : ("ready" as const),
      reasons,
    },
    note:
      "PBR content diagnostics validate channel semantics only, not artistic quality. Normal must be RGB rather than grayscale; height is grayscale; MER is RGB metalness/emissive/roughness; MERS uses alpha for subsurface.",
  };
}
