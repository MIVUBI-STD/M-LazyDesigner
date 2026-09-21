import type { MotionRecipe, MotionPose } from "@/lib/animation/motionRecipe";

export type SequenceStep = {
  id: string;
  duration: number;
  bones: MotionPose["bones"];
  hold?: number;
};

export type SequenceRecipe = {
  name: string;
  loop?: boolean;
  steps: readonly SequenceStep[];
};

export function compileSequenceRecipe(sequence: SequenceRecipe): MotionRecipe {
  if (!sequence.name.trim()) throw new Error("Sequence recipe requires a non-empty name.");
  if (sequence.steps.length === 0) throw new Error("Sequence recipe requires at least one step.");
  let time = 0;
  const poses: MotionPose[] = [];
  for (const step of sequence.steps) {
    if (!step.id) throw new Error("Sequence steps require non-empty IDs.");
    if (!Number.isFinite(step.duration) || step.duration < 0) throw new Error("Sequence step duration must be finite and non-negative.");
    if (step.hold !== undefined && (!Number.isFinite(step.hold) || step.hold < 0)) throw new Error("Sequence hold must be finite and non-negative.");
    poses.push({ id: step.id, time, bones: step.bones });
    time += step.duration;
    if (step.hold && step.hold > 0) {
      poses.push({ id: step.id + ":hold", time, bones: step.bones });
      time += step.hold;
    }
  }
  return { name: sequence.name, loop: sequence.loop, duration: time, poses };
}
