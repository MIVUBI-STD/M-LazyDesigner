import { describe, expect, test } from "bun:test";
import { RUNTIME_EXTENSION_PIPELINE } from "@/server/runtime/extensions";

function extensionIdsFor(target: string): string[] {
  return RUNTIME_EXTENSION_PIPELINE
    .filter((step) => step.targets.includes(target))
    .map((step) => step.id);
}

describe("Runtime extension composition", () => {
  test("extension ids and per-step targets are explicit and unique", () => {
    const ids = RUNTIME_EXTENSION_PIPELINE.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const step of RUNTIME_EXTENSION_PIPELINE) {
      expect(step.targets.length, step.id).toBeGreaterThan(0);
      expect(new Set(step.targets).size, step.id).toBe(step.targets.length);
      expect(typeof step.apply, step.id).toBe("function");
    }
  });

  test("known overlapping capability wrappers have one reviewable order", () => {
    expect(extensionIdsFor("inspect_animation")).toEqual([
      "animation-contracts",
      "authoring-quality",
      "authoring-evidence",
      "animation-native",
      "animation-runtime-resources",
    ]);
    expect(extensionIdsFor("manage_animation_controller")).toEqual([
      "animation-controller-native",
      "animation-runtime-resources",
    ]);
    expect(extensionIdsFor("manage_animation_timeline")).toEqual([
      "animation-contracts",
      "animation-native",
    ]);
    expect(extensionIdsFor("get_texture")).toEqual([
      "texture-contracts",
      "authoring-quality",
      "texture-alpha",
    ]);
    expect(extensionIdsFor("list_textures")).toEqual([
      "authoring-quality",
      "authoring-evidence",
      "texture-quality",
      "texture-authoring",
    ]);
    expect(extensionIdsFor("manage_material")).toEqual([
      "texture-quality",
      "texture-authoring",
    ]);
    expect(extensionIdsFor("inspect_model_bounds")).toEqual([
      "authoring-quality",
      "authoring-evidence",
    ]);
  });

  test("runtime contract composition has no retired tool-side wiring owner", async () => {
    expect(await Bun.file("server/runtime/textureRuntimeContracts.ts").exists()).toBe(true);
    expect(await Bun.file("server/runtime/animationRuntimeContracts.ts").exists()).toBe(true);
    expect(await Bun.file("server/runtime/extensions.ts").exists()).toBe(true);
    expect(await Bun.file("server/tools/paint-texture-transaction.ts").exists()).toBe(true);

    const registration = await Bun.file("server/runtime/registration.ts").text();
    expect(registration.indexOf("registerConsolidatedTools(updateCatalogTool)")).toBeLessThan(
      registration.indexOf("applyRuntimeExtensionPipeline()")
    );
  });
});
