export type AnimationCraftChannel = "position" | "rotation" | "scale";

export type AnimationCraftKeyframeInput = {
  time: number;
  value: readonly unknown[];
};

export type AnimationCraftTrackInput = {
  group_uuid: string;
  group_name: string;
  channel: AnimationCraftChannel;
  /**
   * Legacy timing-only input retained for source compatibility.
   * Prefer keyframes when numeric authored values are available.
   */
  keyframe_times?: readonly number[];
  keyframes?: readonly AnimationCraftKeyframeInput[];
};

export const ANIMATION_CRAFT_EXAMPLE_LIMIT = 8;
const TIME_PRECISION = 4;
const TIME_EPSILON = 1e-4;

function round(value: number, digits = 4): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function canonicalTimes(values: readonly number[]): number[] {
  return [...new Set(values.filter(Number.isFinite).map((value) => Number(value.toFixed(TIME_PRECISION))))].sort((a, b) => a - b);
}

function sameTimes(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function finiteVec3(value: readonly unknown[]): [number, number, number] | null {
  if (
    value.length < 3 ||
    !value.slice(0, 3).every(
      (entry) => typeof entry === "number" && Number.isFinite(entry)
    )
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

function deltaVec(
  channel: AnimationCraftChannel,
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
  return [
    second[0] - first[0],
    second[1] - first[1],
    second[2] - first[2],
  ];
}

function magnitude(value: readonly number[]): number {
  return Math.hypot(...value);
}

function dot(a: readonly number[], b: readonly number[]): number {
  return a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0);
}

function movementEpsilon(channel: AnimationCraftChannel): number {
  if (channel === "rotation") return 0.1;
  if (channel === "scale") return 0.001;
  return 0.001;
}

function coefficientOfVariation(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean <= 0) return null;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    values.length;
  return Math.sqrt(variance) / mean;
}

function numericMotionShape(track: AnimationCraftTrackInput) {
  const keyframes = (track.keyframes ?? [])
    .filter((entry) => Number.isFinite(entry.time))
    .map((entry) => ({
      time: entry.time,
      value: finiteVec3(entry.value),
    }))
    .filter(
      (entry): entry is { time: number; value: [number, number, number] } =>
        entry.value !== null
    )
    .sort((a, b) => a.time - b.time);

  if (keyframes.length < 2) return null;

  const epsilon = movementEpsilon(track.channel);
  const segments: Array<{
    start: number;
    end: number;
    duration: number;
    delta: [number, number, number];
    distance: number;
    speed: number;
  }> = [];

  for (let index = 1; index < keyframes.length; index += 1) {
    const previous = keyframes[index - 1]!;
    const current = keyframes[index]!;
    const duration = current.time - previous.time;
    if (!(duration > TIME_EPSILON)) continue;
    const delta = deltaVec(track.channel, previous.value, current.value);
    const distance = magnitude(delta);
    segments.push({
      start: previous.time,
      end: current.time,
      duration,
      delta,
      distance,
      speed: distance / duration,
    });
  }
  if (segments.length === 0) return null;

  const moving = segments.filter((segment) => segment.distance > epsilon);
  const speeds = moving.map((segment) => segment.speed);
  let reversalCount = 0;
  for (let index = 1; index < moving.length; index += 1) {
    const previous = moving[index - 1]!;
    const current = moving[index]!;
    const denom = magnitude(previous.delta) * magnitude(current.delta);
    if (denom <= 0) continue;
    const cosine = dot(previous.delta, current.delta) / denom;
    if (cosine < -0.25) reversalCount += 1;
  }

  const onset = moving[0]?.start ?? null;
  const lastMoving = moving[moving.length - 1];
  const settle = lastMoving?.end ?? null;
  const speedVariation = coefficientOfVariation(speeds);

  return {
    numeric_key_count: keyframes.length,
    segment_count: segments.length,
    moving_segment_count: moving.length,
    motion_onset_seconds: onset === null ? null : round(onset),
    motion_settle_seconds: settle === null ? null : round(settle),
    peak_segment_speed:
      speeds.length > 0 ? round(Math.max(...speeds)) : null,
    mean_segment_speed:
      speeds.length > 0
        ? round(speeds.reduce((sum, value) => sum + value, 0) / speeds.length)
        : null,
    segment_speed_coefficient_of_variation:
      speedVariation === null ? null : round(speedVariation),
    direction_reversal_count: reversalCount,
  };
}

/**
 * Bounded editing/motion-shape evidence for animation craft.
 *
 * This intentionally never creates a visual PASS. Numeric motion-shape evidence
 * can surface onset, speed-shape and reversal patterns that help a model reason
 * about anticipation/follow-through candidates, but native reference-grounded
 * playback remains the authority for weight, timing, contact and motion quality.
 */
export function analyzeAnimationCraftEvidence(input: {
  length: number;
  tracks: readonly AnimationCraftTrackInput[];
  exampleLimit?: number;
}) {
  const exampleLimit = input.exampleLimit ?? ANIMATION_CRAFT_EXAMPLE_LIMIT;
  if (!Number.isFinite(input.length) || input.length < 0) {
    return {
      state: "unavailable" as const,
      reason: "animation_length_invalid" as const,
    };
  }
  if (!Number.isInteger(exampleLimit) || exampleLimit < 1 || exampleLimit > 100) {
    return {
      state: "unavailable" as const,
      reason: "example_limit_invalid" as const,
    };
  }

  const usable = input.tracks
    .map((track) => {
      const times = canonicalTimes(
        track.keyframes?.map((entry) => entry.time) ??
          track.keyframe_times ??
          []
      );
      return { ...track, times, motion_shape: numericMotionShape(track) };
    })
    .filter((track) => track.times.length > 0);

  const rotationTracks = usable.filter(
    (track) => track.channel === "rotation" && track.times.length >= 3
  );
  const groups = new Map<string, typeof rotationTracks>();
  for (const track of rotationTracks) {
    const key = track.times.join(",");
    const entries = groups.get(key) ?? [];
    entries.push(track);
    groups.set(key, entries);
  }
  const lockstep = [...groups.values()]
    .filter((entries) => entries.length >= 3)
    .sort((a, b) => b.length - a.length)
    .map((entries) => ({
      bone_count: entries.length,
      key_count: entries[0]!.times.length,
      times: entries[0]!.times,
      bones: entries
        .slice(0, exampleLimit)
        .map((track) => ({ uuid: track.group_uuid, name: track.group_name })),
      bones_truncated: entries.length > exampleLimit,
    }));

  const dense = usable
    .map((track) => ({
      ...track,
      key_count: track.times.length,
      keys_per_second:
        input.length > 0
          ? track.times.length / input.length
          : track.times.length,
    }))
    .filter((track) => track.key_count >= 8 && track.keys_per_second > 12)
    .sort((a, b) => b.keys_per_second - a.keys_per_second);

  const repeatedTimeSets = usable.filter((track, index) =>
    usable.some(
      (other, otherIndex) =>
        otherIndex < index && sameTimes(track.times, other.times)
    )
  ).length;

  const motionShapes = usable
    .filter(
      (
        track
      ): track is typeof track & {
        motion_shape: NonNullable<typeof track.motion_shape>;
      } => track.motion_shape !== null
    )
    .map((track) => ({
      group_uuid: track.group_uuid,
      group_name: track.group_name,
      channel: track.channel,
      ...track.motion_shape,
    }));

  const onsetTracks = motionShapes.filter(
    (
      entry
    ): entry is typeof entry & { motion_onset_seconds: number } =>
      entry.motion_onset_seconds !== null
  );
  const onsetValues = onsetTracks.map((entry) => entry.motion_onset_seconds);
  const onsetSpread =
    onsetValues.length >= 2
      ? Math.max(...onsetValues) - Math.min(...onsetValues)
      : null;

  const highSpeedVariation = motionShapes
    .filter(
      (entry) =>
        entry.segment_speed_coefficient_of_variation !== null &&
        entry.segment_speed_coefficient_of_variation >= 1
    )
    .sort(
      (a, b) =>
        (b.segment_speed_coefficient_of_variation ?? 0) -
        (a.segment_speed_coefficient_of_variation ?? 0)
    );

  const reversalTracks = motionShapes
    .filter((entry) => entry.direction_reversal_count > 0)
    .sort(
      (a, b) => b.direction_reversal_count - a.direction_reversal_count
    );

  return {
    state: "available" as const,
    visual_verdict: "not_evaluated" as const,
    track_count: usable.length,
    numeric_motion_shape_track_count: motionShapes.length,
    lockstep_rotation_cohort_count: lockstep.length,
    lockstep_rotation_examples: lockstep.slice(0, exampleLimit),
    lockstep_rotation_examples_truncated: lockstep.length > exampleLimit,
    dense_track_count: dense.length,
    dense_track_examples: dense.slice(0, exampleLimit).map((track) => ({
      group_uuid: track.group_uuid,
      group_name: track.group_name,
      channel: track.channel,
      key_count: track.key_count,
      keys_per_second: Number(track.keys_per_second.toFixed(2)),
    })),
    dense_track_examples_truncated: dense.length > exampleLimit,
    repeated_time_set_track_count: repeatedTimeSets,
    phase_onset: {
      measured_track_count: onsetTracks.length,
      earliest_seconds:
        onsetValues.length > 0 ? round(Math.min(...onsetValues)) : null,
      latest_seconds:
        onsetValues.length > 0 ? round(Math.max(...onsetValues)) : null,
      spread_seconds: onsetSpread === null ? null : round(onsetSpread),
      examples: onsetTracks.slice(0, exampleLimit).map((entry) => ({
        group_uuid: entry.group_uuid,
        group_name: entry.group_name,
        channel: entry.channel,
        motion_onset_seconds: entry.motion_onset_seconds,
      })),
      examples_truncated: onsetTracks.length > exampleLimit,
    },
    speed_shape: {
      high_variability_track_count: highSpeedVariation.length,
      examples: highSpeedVariation.slice(0, exampleLimit).map((entry) => ({
        group_uuid: entry.group_uuid,
        group_name: entry.group_name,
        channel: entry.channel,
        mean_segment_speed: entry.mean_segment_speed,
        peak_segment_speed: entry.peak_segment_speed,
        coefficient_of_variation:
          entry.segment_speed_coefficient_of_variation,
      })),
      examples_truncated: highSpeedVariation.length > exampleLimit,
    },
    direction_reversal: {
      track_count: reversalTracks.length,
      examples: reversalTracks.slice(0, exampleLimit).map((entry) => ({
        group_uuid: entry.group_uuid,
        group_name: entry.group_name,
        channel: entry.channel,
        direction_reversal_count: entry.direction_reversal_count,
      })),
      examples_truncated: reversalTracks.length > exampleLimit,
    },
    note:
      "Lockstep timing, dense sampling, onset spread, speed-shape variability and direction reversals are craft evidence only. They can be intentional. Use them to focus native playback review of anticipation, counter-motion, follow-through and settling; they never prove weight, contact, easing quality or reference fidelity.",
  };
}
