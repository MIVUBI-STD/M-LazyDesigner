import { describe, expect, test } from "bun:test";

describe("animation module ownership", () => {
  test("rigging implementation lives outside the animation facade", async () => {
    const [facade, rigging, shared] = await Promise.all([
      Bun.file("server/tools/animation.ts").text(),
      Bun.file("server/tools/animation-rigging.ts").text(),
      Bun.file("server/tools/animation-shared.ts").text(),
    ]);

    expect(facade).toContain('from "./animation-rigging"');
    expect(facade).toContain("registerBoneRiggingTool();");
    expect(facade).toContain("boneRiggingToolDoc");
    expect(facade).not.toContain("Bone rigging: ${action}");
    expect(facade).not.toContain("function resolveRigElement");

    expect(rigging).toContain("export const boneRiggingParameters");
    expect(rigging).toContain("export function registerBoneRiggingTool");
    expect(rigging).toContain("wouldCreateRigHierarchyCycle");
    expect(shared).toContain("resolveAnimationRigGroup");
    expect(shared).toContain("toArrayVector3");
  });
  test("animation creation implementation lives outside the animation facade", async () => {
    const [facade, creation] = await Promise.all([
      Bun.file("server/tools/animation.ts").text(),
      Bun.file("server/tools/animation-create.ts").text(),
    ]);

    expect(facade).toContain('from "./animation-create"');
    expect(facade).toContain("registerCreateAnimationTool();");
    expect(facade).toContain("createAnimationToolDoc");
    expect(facade).not.toContain('Undo.finishEdit("Create animation"');
    expect(creation).toContain("export const createAnimationParameters");
    expect(creation).toContain("export function registerCreateAnimationTool");
    expect(creation).toContain("normalizeBedrockAnimationName");
  });

  test("animation facade aggregates focused capability modules only", async () => {
    const [facade, keyframes, timeline, batch] = await Promise.all([
      Bun.file("server/tools/animation.ts").text(),
      Bun.file("server/tools/animation-keyframes.ts").text(),
      Bun.file("server/tools/animation-timeline.ts").text(),
      Bun.file("server/tools/animation-batch.ts").text(),
    ]);

    expect(facade).not.toContain("createTool(");
    expect(facade).not.toContain("Undo.initEdit");
    expect(facade).not.toContain("Timeline.");
    expect(facade).toContain("registerAnimationKeyframeTools();");
    expect(facade).toContain("registerAnimationTimelineTool();");
    expect(facade).toContain("registerAnimationBatchTools();");

    expect(keyframes).toContain("export const manageKeyframesParameters");
    expect(keyframes).toContain("export const animationGraphEditorParameters");
    expect(timeline).toContain("export const animationTimelineParameters");
    expect(batch).toContain("export const batchKeyframeOperationsParameters");
    expect(batch).toContain("export const animationCopyPasteParameters");
  });

});
