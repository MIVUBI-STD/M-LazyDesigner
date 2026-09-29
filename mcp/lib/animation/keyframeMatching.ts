export function resolveUniqueKeyframeMatchIndexes(
  existingTimes: readonly number[],
  requestedTimes: readonly number[],
  tolerance = 0.001
): number[] {
  if (!Number.isFinite(tolerance) || tolerance <= 0) {
    throw new Error("Keyframe match tolerance must be finite and greater than 0.");
  }
  if (!existingTimes.every(Number.isFinite) || !requestedTimes.every(Number.isFinite)) {
    throw new Error("Keyframe matching requires finite existing and requested times.");
  }

  const claimedIndexes = new Set<number>();
  return requestedTimes.map((requestedTime) => {
    const matches: number[] = [];
    existingTimes.forEach((existingTime, index) => {
      if (Math.abs(existingTime - requestedTime) < tolerance) matches.push(index);
    });

    if (matches.length === 0) {
      throw new Error(`No existing keyframe matches requested time ${requestedTime}.`);
    }
    if (matches.length > 1) {
      throw new Error(
        `Requested time ${requestedTime} ambiguously matches ${matches.length} existing keyframes.`
      );
    }

    const matchedIndex = matches[0];
    if (claimedIndexes.has(matchedIndex)) {
      throw new Error(
        `Multiple requested times resolve to the same existing keyframe near ${requestedTime}.`
      );
    }
    claimedIndexes.add(matchedIndex);
    return matchedIndex;
  });
}
