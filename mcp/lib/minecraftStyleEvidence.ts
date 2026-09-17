export type RepresentationOwner = "geometry" | "texture" | "animation" | "omit";

export type MinecraftStyleFeatureInput = {
  id: string;
  owner: RepresentationOwner;
  affects_silhouette?: boolean;
  affects_volume?: boolean;
  surface_only?: boolean;
  motion_only?: boolean;
  pixel_scale?: number;
};

export type MinecraftStyleIssue =
  | { kind: "surface_detail_overmodeled"; feature_id: string }
  | { kind: "silhouette_under_modeled"; feature_id: string }
  | { kind: "motion_misowned"; feature_id: string; owner: RepresentationOwner }
  | { kind: "pixel_scale_conflict"; min_scale: number; max_scale: number; ratio: number };

/**
 * Minecraft-style representation evidence based on explicit semantic ownership.
 * This does not impose Vanilla style on projects that intentionally choose a
 * different art direction; callers decide whether Minecraft-style coherence is
 * a requirement for the current asset.
 */
export function analyzeMinecraftStyleEvidence(input: {
  features: readonly MinecraftStyleFeatureInput[];
  pixelScaleRatioTolerance?: number;
  exampleLimit?: number;
}) {
  const tolerance = input.pixelScaleRatioTolerance ?? 1.5;
  const exampleLimit = input.exampleLimit ?? 12;
  if (!Number.isFinite(tolerance) || tolerance < 1 || !Number.isInteger(exampleLimit) || exampleLimit < 1 || exampleLimit > 100) {
    return { state: "unavailable" as const, reason: "style_evidence_parameters_invalid" as const };
  }

  const issues: MinecraftStyleIssue[] = [];
  const scales: number[] = [];

  for (const feature of input.features) {
    if (!feature.id.trim()) continue;
    if (feature.surface_only === true && feature.owner === "geometry") {
      issues.push({ kind: "surface_detail_overmodeled", feature_id: feature.id });
    }
    if ((feature.affects_silhouette === true || feature.affects_volume === true) && feature.owner === "texture") {
      issues.push({ kind: "silhouette_under_modeled", feature_id: feature.id });
    }
    if (feature.motion_only === true && feature.owner !== "animation" && feature.owner !== "omit") {
      issues.push({ kind: "motion_misowned", feature_id: feature.id, owner: feature.owner });
    }
    if (typeof feature.pixel_scale === "number" && Number.isFinite(feature.pixel_scale) && feature.pixel_scale > 0) {
      scales.push(feature.pixel_scale);
    }
  }

  if (scales.length >= 2) {
    const min = Math.min(...scales);
    const max = Math.max(...scales);
    const ratio = max / min;
    if (ratio > tolerance) {
      issues.push({
        kind: "pixel_scale_conflict",
        min_scale: Number(min.toFixed(4)),
        max_scale: Number(max.toFixed(4)),
        ratio: Number(ratio.toFixed(4)),
      });
    }
  }

  return {
    state: "available" as const,
    visual_verdict: "not_evaluated" as const,
    issue_count: issues.length,
    issue_examples: issues.slice(0, exampleLimit),
    issue_examples_truncated: issues.length > exampleLimit,
    representation_ready: issues.length === 0,
    note: "Evidence follows Minecraft-native simplicity: model owns recognizable shape/volume, texture owns most surface detail, animation owns motion. These are review signals, not an aggregate style score or permission to override an explicit non-Vanilla art direction.",
  };
}
