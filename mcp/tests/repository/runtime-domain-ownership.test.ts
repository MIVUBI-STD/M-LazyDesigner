import { describe, expect, test } from "bun:test";

const WRAPPERS: Readonly<Record<string,string>> = {
  "server/runtime/animationRuntimeContracts.ts": 'export * from "./contracts/animation";\n',
  "server/runtime/textureRuntimeContracts.ts": 'export * from "./contracts/texture";\n',
  "server/runtime/authoringRecipeOwnership.ts": 'export * from "./recipes/authoring/ownership";\n',
  "server/runtime/authoringRecipeRuntime.ts": 'export * from "./recipes/authoring/runtime";\n',
  "server/runtime/authoringRecipeService.ts": 'export * from "./recipes/authoring/service";\n',
  "server/runtime/materialRecipeRuntime.ts": 'export * from "./recipes/material/runtime";\n',
  "server/runtime/semanticUvRuntime.ts": 'export * from "./uv/semanticRuntime";\n',
  "server/runtime/uvLayoutRuntime.ts": 'export * from "./uv/layoutRuntime";\n',
  "server/runtime/uvLayoutService.ts": 'export * from "./uv/layoutService";\n',
};

describe("runtime canonical ownership", () => {
  test("migrated root paths remain compatibility-only facades", async () => {
    for (const [path, expected] of Object.entries(WRAPPERS)) {
      expect(await Bun.file(path).text()).toBe(expected);
    }
  });
});
