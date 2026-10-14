import { describe, expect, test } from "bun:test";
import {
  animationEffectOperationSchema,
  manageAnimationEffectsParameters,
  normalizeEffectiveParticleScript,
  effectiveTimelineScriptLines,
} from "@/server/tools/animation-effects";

describe("existing animation effect mutation contract", () => {
  test("accepts bounded particle/sound/timeline lifecycle operations", () => {
    expect(
      manageAnimationEffectsParameters.parse({
        animation_id: "animation.walk",
        operations: [
          { operation: "add", channel: "particle", time: 0.25, effect: "minecraft:spark", locator: "hand" },
          { operation: "update", channel: "sound", keyframe_uuid: "sound-kf", data_point_index: 0, effect: "weapon.swing" },
          { operation: "remove", channel: "timeline", keyframe_uuid: "timeline-kf" },
        ],
      }).operations
    ).toHaveLength(3);
  });

  test("rejects identity/payload ambiguity and unknown fields before runtime mutation", () => {
    expect(() =>
      animationEffectOperationSchema.parse({
        operation: "update",
        channel: "particle",
        keyframe_uuid: "particle-kf",
        effect: "minecraft:spark",
      })
    ).toThrow("data_point_index");

    expect(() =>
      animationEffectOperationSchema.parse({
        operation: "add",
        channel: "timeline",
        time: 1,
        effect: "not-a-timeline-field",
        script: "variable.hit = 1;",
      })
    ).toThrow("timeline owns only script");

    expect(() =>
      animationEffectOperationSchema.parse({
        operation: "remove",
        channel: "sound",
        keyframe_uuid: "sound-kf",
        data_point_index: 0,
        time: 2,
      })
    ).toThrow("identity only");

    expect(
      animationEffectOperationSchema.safeParse({
        operation: "add",
        channel: "sound",
        time: 0,
        effect: "weapon.swing",
        unsupported: true,
      }).success
    ).toBe(false);
    expect(
      manageAnimationEffectsParameters.safeParse({
        operations: [{ operation: "add", channel: "sound", time: 0, effect: "weapon.swing" }],
        unsupported: true,
      }).success
    ).toBe(false);
  });

  test("effective script comparison follows Bedrock export semantics", () => {
    expect(normalizeEffectiveParticleScript("variable.a = 1")).toBe("variable.a = 1;");
    expect(normalizeEffectiveParticleScript(" ; \n")).toBeNull();
    expect(effectiveTimelineScriptLines("variable.a = 1\n\n;\n/say ready")).toEqual([
      "variable.a = 1;",
      "/say ready",
    ]);
  });

  test("source keeps one-Undo preflight, native datapoint cap, preview-file preservation, and inspect-compatible continuation", async () => {
    const [source, registrations, docsManifest, inspection] = await Promise.all([
      Promise.all(["server/tools/animation/effects.ts", "server/tools/animation/effectState.ts"].map((path) => Bun.file(path).text())).then((parts) => parts.join("\n")),
      Bun.file("server/runtime/registration.ts").text(),
      Bun.file("scripts/generate/internal/docs-manifest.ts").text(),
      Bun.file("server/tools/animation/inspectionSchema.ts").text(),
    ]);

    expect(source).toContain("const targeted = new Set<string>()");
    expect(source).toContain("moving does not implicitly merge identities");
    expect(source).toContain("native maximum of 1000 data points");
    expect(source).toContain('file: typeof point.file === "string" ? point.file : ""');
    expect(source).toMatch(/bind_to_actor:\s*snapshot\.bind_to_actor === false \? false : null/);
    expect(source).toMatch(/pre_effect_script:\s*normalizeEffectiveParticleScript\(snapshot\.script\)/);
    expect(source).toContain("Undo.initEdit({ animations: [animation] })");
    expect(source.match(/Undo\.initEdit/g)?.length).toBe(1);
    expect(source).not.toContain("MolangParser");
    expect(registrations).toContain("registerAnimationEffectTools();");
    expect(registrations).toContain("registerAnimationFamilyTools");
    expect(docsManifest).toContain('import { animationEffectToolDocs } from "../../../server/tools/animation-effects";');
    expect(docsManifest).toContain("...animationEffectToolDocs");
    expect(inspection).toContain("particle/sound/timeline effect keyframes");
  });
});
