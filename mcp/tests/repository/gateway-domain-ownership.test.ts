import { describe, expect, test } from "bun:test";

const WRAPPERS: Readonly<Record<string,string>> = {
  "gateway/outputSchemas.ts": 'export * from "./contracts/outputSchemas";\n',
  "gateway/resultCompaction.ts": 'export * from "./presentation/resultCompaction";\n',
  "gateway/statusProjection.ts": 'export * from "./presentation/statusProjection";\n',
};

describe("gateway canonical ownership", () => {
  test("migrated root paths remain compatibility-only facades", async () => {
    for (const [path, expected] of Object.entries(WRAPPERS)) {
      expect(await Bun.file(path).text()).toBe(expected);
    }
  });
});
