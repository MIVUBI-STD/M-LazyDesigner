/// <reference types="blockbench-types" />

import type { ToolSpec } from "@/lib/factories";
import {
  animationCopyPasteToolDoc,
  batchKeyframeOperationsToolDoc,
  registerAnimationBatchTools,
} from "./animation-batch";
export {
  animationCopyPasteParameters,
  batchKeyframeOperationsParameters,
  countAnimationClipboardKeyframes,
  keyframeBelongsToAnimation,
  requireValidPlannedKeyframeTimes,
  requireValidPlannedPasteChannelTimes,
} from "./animation-batch";
import {
  createAnimationToolDoc,
  registerCreateAnimationTool,
} from "./animation-create";
export {
  createAnimationParameters,
  normalizeBedrockAnimationName,
} from "./animation-create";
import {
  animationGraphEditorToolDoc,
  manageKeyframesToolDoc,
  registerAnimationKeyframeTools,
} from "./animation-keyframes";
export {
  animationGraphEditorParameters,
  manageKeyframesParameters,
  resolveUniqueKeyframeMatchIndexes,
} from "./animation-keyframes";
import {
  boneRiggingToolDoc,
  registerBoneRiggingTool,
} from "./animation-rigging";
export {
  boneRiggingParameters,
  deriveMirroredRigName,
  hasCaseInsensitiveRigNameCollision,
  wouldCreateRigHierarchyCycle,
} from "./animation-rigging";
import {
  animationTimelineToolDoc,
  registerAnimationTimelineTool,
} from "./animation-timeline";
export {
  animationTimelineParameters,
  normalizeAnimationMolangProperty,
} from "./animation-timeline";

export const animationToolDocs: ToolSpec[] = [
  createAnimationToolDoc,
  manageKeyframesToolDoc,
  animationGraphEditorToolDoc,
  boneRiggingToolDoc,
  animationTimelineToolDoc,
  batchKeyframeOperationsToolDoc,
  animationCopyPasteToolDoc,
];

export function registerAnimationTools(): void {
  registerCreateAnimationTool();
  registerAnimationKeyframeTools();
  registerBoneRiggingTool();
  registerAnimationTimelineTool();
  registerAnimationBatchTools();
}
