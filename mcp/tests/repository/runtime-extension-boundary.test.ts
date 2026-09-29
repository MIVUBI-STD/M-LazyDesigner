import { describe, expect, test } from "bun:test";

const MIGRATED_RUNTIME_EXTENSION_WRAPPERS: Readonly<Record<string, string>> = {
  "animation-native-intelligence.ts":
    'export * from "../runtime/extensions/animation/nativeIntelligence";\n',
  "animation-controller-native-intelligence.ts":
    'export * from "../runtime/extensions/animation/controllerNativeIntelligence";\n',
  "animation-runtime-resource-intelligence.ts":
    'export * from "../runtime/extensions/animation/runtimeResourceIntelligence";\n',
  "texture-quality-runtime.ts":
    'export * from "../runtime/extensions/texture/quality";\n',
  "texture-authoring-runtime.ts":
    'export * from "../runtime/extensions/texture/authoring";\n',
  "texture-alpha-runtime.ts":
    'export * from "../runtime/extensions/texture/alpha";\n',
};

describe("Runtime extension ownership", () => {
  test("migrated server/tools extension paths stay compatibility-only", async () => {
    for (const [name, expected] of Object.entries(
      MIGRATED_RUNTIME_EXTENSION_WRAPPERS
    )) {
      expect(await Bun.file(`server/tools/${name}`).text()).toBe(expected);
    }
  });

  test("canonical Runtime extension composition imports Runtime owners", async () => {
    const source = await Bun.file("server/runtime/extensions.ts").text();

    expect(source).toContain(
      'from "./extensions/animation/nativeIntelligence"'
    );
    expect(source).toContain(
      'from "./extensions/animation/controllerNativeIntelligence"'
    );
    expect(source).toContain(
      'from "./extensions/animation/runtimeResourceIntelligence"'
    );

    expect(source).not.toContain(
      'from "../tools/animation-native-intelligence"'
    );
    expect(source).not.toContain(
      'from "../tools/animation-controller-native-intelligence"'
    );
    expect(source).not.toContain(
      'from "../tools/animation-runtime-resource-intelligence"'
    );
    expect(source).toContain('from "./extensions/texture/quality"');
    expect(source).toContain('from "./extensions/texture/authoring"');
    expect(source).toContain('from "./extensions/texture/alpha"');
    expect(source).not.toContain('from "../tools/texture-quality-runtime"');
    expect(source).not.toContain('from "../tools/texture-authoring-runtime"');
    expect(source).not.toContain('from "../tools/texture-alpha-runtime"');
  });

  test("Runtime extensions stay below Gateway", async () => {
    for (const path of [
      "server/runtime/extensions/animation/nativeIntelligence.ts",
      "server/runtime/extensions/animation/controllerNativeIntelligence.ts",
      "server/runtime/extensions/animation/runtimeResourceIntelligence.ts",
      "server/runtime/extensions/texture/quality.ts",
      "server/runtime/extensions/texture/authoring.ts",
      "server/runtime/extensions/texture/alpha.ts",
    ]) {
      const source = await Bun.file(path).text();
      expect(source).not.toContain('from "@/gateway/');
      expect(source).not.toContain('from "../../../gateway');
    }
  });
});
