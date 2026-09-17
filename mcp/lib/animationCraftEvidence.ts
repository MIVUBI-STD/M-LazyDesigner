export type AnimationCraftTrackInput = {
  group_uuid: string;
  group_name: string;
  channel: "position" | "rotation" | "scale";
  keyframe_times: readonly number[];
};

export const ANIMATION_CRAFT_EXAMPLE_LIMIT = 8;
const TIME_PRECISION = 4;

function canonicalTimes(values: readonly number[]): number[] {
  return [...new Set(values.filter(Number.isFinite).map((value) => Number(value.toFixed(TIME_PRECISION))))].sort((a, b) => a - b);
}

function sameTimes(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * Editing-pattern evidence for animation craft. This intentionally does not infer
 * motion quality, contact correctness, weight transfer, or playback smoothness.
 */
export function analyzeAnimationCraftEvidence(input: {
  length: number;
  tracks: readonly AnimationCraftTrackInput[];
  exampleLimit?: number;
}) {
  const exampleLimit = input.exampleLimit ?? ANIMATION_CRAFT_EXAMPLE_LIMIT;
  if (!Number.isFinite(input.length) || input.length < 0) {
    return { state: "unavailable" as const, reason: "animation_length_invalid" as const };
  }

  const usable = input.tracks
    .map((track) => ({ ...track, times: canonicalTimes(track.keyframe_times) }))
    .filter((track) => track.times.length > 0);
  const rotationTracks = usable.filter((track) => track.channel === "rotation" && track.times.length >= 3);
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
      key_count: entries[0].times.length,
      times: entries[0].times,
      bones: entries.slice(0, exampleLimit).map((track) => ({ uuid: track.group_uuid, name: track.group_name })),
      bones_truncated: entries.length > exampleLimit,
    }));

  const dense = usable
    .map((track) => ({
      ...track,
      key_count: track.times.length,
      keys_per_second: input.length > 0 ? track.times.length / input.length : track.times.length,
    }))
    .filter((track) => track.key_count >= 8 && track.keys_per_second > 12)
    .sort((a, b) => b.keys_per_second - a.keys_per_second);

  const repeatedTimeSets = usable.filter((track, index) =>
    usable.some((other, otherIndex) => otherIndex < index && sameTimes(track.times, other.times))
  ).length;

  return {
    state: "available" as const,
    visual_verdict: "not_evaluated" as const,
    track_count: usable.length,
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
    note: "Lockstep timing and dense sampling are review hints only. They can be intentional. Judge anticipation, contact/attachment, weight transfer, follow-through, loop continuity and secondary delay from reference-grounded native playback; static timing evidence never proves motion quality.",
  };
}
