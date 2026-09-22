import { describe, expect, test } from "bun:test";

describe("TypeScript project graph strictness", () => {
  test("every composite project enforces unused-symbol hygiene itself", async () => {
    for (const path of [
      "tsconfig.semantic-core.json",
      "tsconfig.gateway-shared.json",
      "tsconfig.runtime-project.json",
      "gateway/tsconfig.project.json",
    ]) {
      const config = JSON.parse(await Bun.file(path).text());
      expect(config.compilerOptions.noUnusedLocals, path).toBe(true);
      expect(config.compilerOptions.noUnusedParameters, path).toBe(true);
    }
  });
});
