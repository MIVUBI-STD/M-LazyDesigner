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
});
