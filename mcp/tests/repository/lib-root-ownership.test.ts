import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";

const SHARED_ROOT_IMPLEMENTATIONS = new Set([
  "constants.ts",
  "factories.ts",
]);

const CANONICAL_WRAPPER =
  /^export \* from "\.\/(?:animation|authoring|bedrock|blockbench|capabilities|core|geometry|particle|product|prompts|protocol|reference|runtime|texture|uv)\/[A-Za-z0-9_./-]+";\n$/;

describe("lib root ownership", () => {
  test("root contains only declared shared implementations or compatibility wrappers", async () => {
    const entries = await readdir("lib", { withFileTypes: true });
    const violations: string[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
      const source = await Bun.file(`lib/${entry.name}`).text();
      if (CANONICAL_WRAPPER.test(source)) continue;
      if (SHARED_ROOT_IMPLEMENTATIONS.has(entry.name)) continue;
      violations.push(entry.name);
    }

    expect(violations).toEqual([]);
  });

  test("shared-root allowlist has no stale entries", async () => {
    const existing = new Set(
      (await readdir("lib", { withFileTypes: true }))
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
    );

    const stale = [...SHARED_ROOT_IMPLEMENTATIONS].filter(
      (name) => !existing.has(name)
    );

    expect(stale).toEqual([]);
  });
});
