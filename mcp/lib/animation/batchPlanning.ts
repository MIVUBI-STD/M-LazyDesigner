export function countAnimationClipboardKeyframes(
  channels: Record<string, readonly unknown[]>
): number {
  return Object.values(channels).reduce(
    (count, keyframes) => count + keyframes.length,
    0
  );
}

export function keyframeBelongsToAnimation(
  keyframe: { animator?: { animation?: unknown } | null },
  animation: unknown
): boolean {
  return keyframe.animator?.animation === animation;
}

export function requireValidPlannedKeyframeTimes(
  times: readonly number[],
  context: string,
  rejectExactDuplicates = false
): void {
  times.forEach((time, index) => {
    if (!Number.isFinite(time) || time < 0 || time > 10000) {
      throw new Error(
        `${context} would place keyframe ${index} at invalid time ${time}; Blockbench authored keyframe time must stay within 0..10000 seconds.`
      );
    }
  });

  if (rejectExactDuplicates && new Set(times).size !== times.length) {
    throw new Error(
      `${context} would collapse multiple selected keyframes onto the same effective time. Use a different scale factor/pivot or reduce the selection.`
    );
  }
}

export function requireValidPlannedPasteChannelTimes(
  channels: Readonly<Record<string, readonly number[]>>
): void {
  Object.entries(channels).forEach(([channel, times]) => {
    requireValidPlannedKeyframeTimes(
      times,
      `Animation paste ${channel} channel`,
      true
    );
  });
}


export type BatchSelectionMode = "all" | "selected" | "range" | "pattern";

export type BatchSelectionRange = Readonly<{
  start: number;
  end: number;
}>;

export type BatchSelectionPattern = Readonly<{
  interval: number;
  offset: number;
}>;

export function selectBatchKeyframes<T extends { time: number }>(
  all: readonly T[],
  selected: readonly T[],
  selection: BatchSelectionMode,
  options: Readonly<{
    range?: BatchSelectionRange;
    pattern?: BatchSelectionPattern;
    tolerance?: number;
  }> = {}
): T[] {
  const tolerance = options.tolerance ?? 0.001;
  if (!Number.isFinite(tolerance) || tolerance <= 0) {
    throw new Error("Batch selection tolerance must be finite and greater than 0.");
  }

  let result: T[];
  switch (selection) {
    case "all":
      result = [...all];
      break;
    case "selected":
      result = [...selected];
      break;
    case "range": {
      const range = options.range;
      if (!range) throw new Error("Range required for range selection.");
      result = all.filter(
        (keyframe) => keyframe.time >= range.start && keyframe.time <= range.end
      );
      break;
    }
    case "pattern": {
      const pattern = options.pattern;
      if (!pattern) throw new Error("Pattern required for pattern selection.");
      if (!Number.isFinite(pattern.interval) || pattern.interval <= 0) {
        throw new Error("Pattern interval must be finite and greater than 0.");
      }
      if (!Number.isFinite(pattern.offset)) {
        throw new Error("Pattern offset must be finite.");
      }
      result = all.filter((keyframe) => {
        const relativeTime = keyframe.time - pattern.offset;
        return Math.abs(relativeTime % pattern.interval) < tolerance;
      });
      break;
    }
  }

  if (result.length === 0) {
    throw new Error("No keyframes found matching selection criteria.");
  }
  return result;
}

export function planMirroredBatchKeyframes<
  T extends { transform?: unknown; channel?: unknown }
>(keyframes: readonly T[]): T[] {
  const mirrored = keyframes.filter(
    (keyframe) => Boolean(keyframe.transform) && keyframe.channel !== "scale"
  );
  if (mirrored.length === 0) {
    throw new Error(
      "No position or rotation transform keyframes found matching selection criteria for mirror."
    );
  }
  return mirrored;
}

export function planSmoothedBatchKeyframes<
  T extends { transform?: unknown }
>(keyframes: readonly T[]): T[] {
  const smoothed = keyframes.filter((keyframe) => Boolean(keyframe.transform));
  if (smoothed.length === 0) {
    throw new Error(
      "No transform keyframes found matching selection criteria for smooth."
    );
  }
  return smoothed;
}

export function reverseBatchTimeBounds(
  times: readonly number[]
): Readonly<{ start: number; end: number }> {
  if (times.length === 0 || !times.every(Number.isFinite)) {
    throw new Error("Reverse planning requires at least one finite keyframe time.");
  }
  return {
    start: Math.min(...times),
    end: Math.max(...times),
  };
}
