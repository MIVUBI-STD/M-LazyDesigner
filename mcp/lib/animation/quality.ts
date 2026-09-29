export type AnimationQualityChannel = "position" | "rotation" | "scale";

export type AnimationQualityTrackInput = {
  group_uuid: string;
  group_name: string;
  is_root: boolean;
  channel: AnimationQualityChannel;
  keyframes: Array<{ time: number; value: readonly unknown[] }>;
};

export const ANIMATION_QUALITY_EXAMPLE_LIMIT = 8;
const TIME_EPSILON = 1e-4;

function round(value: number, digits = 4): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function finiteVec3(value: readonly unknown[]): [number, number, number] | null {
  if (
    value.length < 3 ||
    !value.slice(0, 3).every((entry) => typeof entry === "number" && Number.isFinite(entry))
  ) {
    return null;
  }
  return [value[0] as number, value[1] as number, value[2] as number];
}

function angularDelta(from: number, to: number): number {
  let delta = ((to - from + 180) % 360 + 360) % 360 - 180;
  if (Object.is(delta, -0)) delta = 0;
  return delta;
}

function vectorDelta(
  channel: AnimationQualityChannel,
  first: [number, number, number],
  second: [number, number, number]
): [number, number, number] {
  if (channel === "rotation") {
    return [
      angularDelta(first[0], second[0]),
      angularDelta(first[1], second[1]),
      angularDelta(first[2], second[2]),
    ];
  }
  return [second[0] - first[0], second[1] - first[1], second[2] - first[2]];
}

function magnitude(value: readonly number[]): number {
  return Math.hypot(...value);
}

function cadence(keyframes: Array<{ time: number }>) {
  const times = [...new Set(keyframes.map((keyframe) => keyframe.time).filter(Number.isFinite))].sort((a, b) => a - b);
  if (times.length < 3) return null;
  const intervals = times.slice(1).map((time, index) => time - times[index]).filter((value) => value > 0);
  if (intervals.length < 2) return null;
  const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const variance = intervals.reduce((sum, value) => sum + (value - mean) ** 2, 0) / intervals.length;
  return {
    interval_count: intervals.length,
    mean_seconds: round(mean),
    min_seconds: round(Math.min(...intervals)),
    max_seconds: round(Math.max(...intervals)),
    coefficient_of_variation: mean === 0 ? 0 : round(Math.sqrt(variance) / mean),
  };
}

function seamThreshold(channel: AnimationQualityChannel): number {
  if (channel === "rotation") return 0.5;
  if (channel === "scale") return 0.002;
  return 0.02;
}

export function analyzeAnimationQuality(input: {
  loop_mode: string;
  length: number;
  tracks: readonly AnimationQualityTrackInput[];
  example_limit?: number;
}) {
  const exampleLimit = input.example_limit ?? ANIMATION_QUALITY_EXAMPLE_LIMIT;
  if (!Number.isFinite(input.length) || input.length < 0) {
    return { state: "unavailable" as const, reason: "animation_length_invalid" as const };
  }

  const loopTrackDiagnostics: Array<Record<string, unknown>> = [];
  const cadenceDiagnostics: Array<Record<string, unknown>> = [];
  let boundaryMissingCount = 0;
  let nonNumericBoundaryCount = 0;
  let reviewSeamCount = 0;
  let numericEvaluatedCount = 0;
  let insufficientKeyCount = 0;

  for (const track of input.tracks) {
    const keyframes = track.keyframes
      .filter((keyframe) => Number.isFinite(keyframe.time) && keyframe.time >= 0)
      .slice()
      .sort((a, b) => a.time - b.time);
    const cadenceSummary = cadence(keyframes);
    if (cadenceSummary && cadenceSummary.coefficient_of_variation >= 0.75) {
      cadenceDiagnostics.push({
        group_uuid: track.group_uuid,
        group_name: track.group_name,
        channel: track.channel,
        ...cadenceSummary,
      });
    }

    if (input.loop_mode !== "loop" || input.length <= 0) continue;
    if (keyframes.length < 2) {
      insufficientKeyCount += 1;
      continue;
    }
    const first = keyframes[0];
    const last = keyframes[keyframes.length - 1];
    const hasStart = Math.abs(first.time) <= TIME_EPSILON;
    const hasEnd = Math.abs(last.time - input.length) <= TIME_EPSILON;
    if (!hasStart || !hasEnd) {
      boundaryMissingCount += 1;
      continue;
    }

    const start = finiteVec3(first.value);
    const end = finiteVec3(last.value);
    if (!start || !end) {
      nonNumericBoundaryCount += 1;
      continue;
    }

    const delta = vectorDelta(track.channel, start, end);
    numericEvaluatedCount += 1;
    const deltaMagnitude = magnitude(delta);
    const rootLocomotionPosition = track.is_root && track.channel === "position";
    const requiresReview = !rootLocomotionPosition && deltaMagnitude > seamThreshold(track.channel);
    if (requiresReview) reviewSeamCount += 1;

    if (requiresReview || rootLocomotionPosition) {
      loopTrackDiagnostics.push({
        group_uuid: track.group_uuid,
        group_name: track.group_name,
        channel: track.channel,
        root_track: track.is_root,
        delta: delta.map((value) => round(value)),
        delta_magnitude: round(deltaMagnitude),
        ...(track.channel === "position" ? { delta_blocks: round(deltaMagnitude / 16) } : {}),
        classification: rootLocomotionPosition
          ? "root_locomotion_observation"
          : requiresReview
            ? "seam_review"
            : "continuous",
      });
    }
  }

  return {
    state: "available" as const,
    visual_verdict: "not_evaluated" as const,
    loop_mode: input.loop_mode,
    length_seconds: input.length,
    evaluated_tracks: input.tracks.length,
    loop_seam: {
      applicable: input.loop_mode === "loop",
      numeric_evaluated_track_count: numericEvaluatedCount,
      insufficient_key_track_count: insufficientKeyCount,
      review_track_count: reviewSeamCount,
      boundary_missing_track_count: boundaryMissingCount,
      non_numeric_boundary_track_count: nonNumericBoundaryCount,
      examples: loopTrackDiagnostics.slice(0, exampleLimit),
      examples_truncated: loopTrackDiagnostics.length > exampleLimit,
      note: "Numeric endpoint comparison only, not interpolation, playback, contact, foot sliding or weight evaluation. Expressions and insufficient keys remain unevaluated, not passing. Root position displacement is locomotion evidence, not a seam defect.",
    },
    cadence: {
      high_variability_track_count: cadenceDiagnostics.length,
      examples: cadenceDiagnostics.slice(0, exampleLimit),
      examples_truncated: cadenceDiagnostics.length > exampleLimit,
      note: "Irregular keyframe spacing can be intentional; this is an editing-efficiency review hint only.",
    },
  };
}
