import type { MotionPose, MotionRecipe, MotionVec3 } from "@/lib/animation/motionRecipe";

export type SecondaryMotionLink = {
  parent_bone: string;
  child_bone: string;
  lag_seconds?: number;
  rotation_gain?: number;
  position_gain?: number;
  settle?: number;
};

function scaleVec(value: MotionVec3, gain: number): MotionVec3 {
  return [value[0] * gain, value[1] * gain, value[2] * gain];
}

export function compileSecondaryMotion(
  recipe: MotionRecipe,
  links: readonly SecondaryMotionLink[]
): MotionRecipe {
  if (links.length === 0) return recipe;
  const poses: MotionPose[] = recipe.poses.map((pose) => ({ ...pose, bones: { ...pose.bones } }));
  const additions: MotionPose[] = [];

  for (const link of links) {
    if (!link.parent_bone.trim() || !link.child_bone.trim()) {
      throw new Error("Secondary motion links require parent and child bone names.");
    }
    const lag = link.lag_seconds ?? 0.06;
    const rotationGain = link.rotation_gain ?? 0.35;
    const positionGain = link.position_gain ?? 0.15;
    const settle = link.settle ?? 0.55;
    if (![lag, rotationGain, positionGain, settle].every(Number.isFinite) || lag < 0 || settle < 0 || settle > 1) {
      throw new Error("Secondary motion link parameters are outside supported bounds.");
    }

    for (const pose of recipe.poses) {
      const parent = pose.bones[link.parent_bone];
      if (!parent) continue;
      const bones: Record<string, NonNullable<MotionPose["bones"][string]>> = {};
      const child: NonNullable<MotionPose["bones"][string]> = {};
      if (parent.rotation) child.rotation = scaleVec(parent.rotation, rotationGain);
      if (parent.position) child.position = scaleVec(parent.position, positionGain);
      if (!child.rotation && !child.position) continue;
      bones[link.child_bone] = { ...child, interpolation: "bezier" };
      additions.push({
        id: pose.id + ":secondary:" + link.child_bone,
        time: pose.time + lag,
        bones,
      });
      if (settle > 0 && pose.time + lag * 2 <= (recipe.duration ?? Number.POSITIVE_INFINITY)) {
        const settleBone: NonNullable<MotionPose["bones"][string]> = {};
        if (child.rotation) settleBone.rotation = scaleVec(child.rotation, settle);
        if (child.position) settleBone.position = scaleVec(child.position, settle);
        additions.push({
          id: pose.id + ":settle:" + link.child_bone,
          time: pose.time + lag * 2,
          bones: { [link.child_bone]: { ...settleBone, interpolation: "bezier" } },
        });
      }
    }
  }

  const merged = [...poses, ...additions]
    .sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));

  const byTime = new Map<number, MotionPose>();
  for (const pose of merged) {
    const current = byTime.get(pose.time);
    if (!current) {
      byTime.set(pose.time, pose);
      continue;
    }
    const overlap = Object.keys(pose.bones).filter((bone) => current.bones[bone] !== undefined);
    if (overlap.length > 0) {
      throw new Error("Secondary motion generated conflicting bone ownership at time " + pose.time + ": " + overlap.join(", ") + ".");
    }
    byTime.set(pose.time, { ...current, id: current.id + "+" + pose.id, bones: { ...current.bones, ...pose.bones } });
  }
  return { ...recipe, poses: [...byTime.values()].sort((a, b) => a.time - b.time || a.id.localeCompare(b.id)) };
}
