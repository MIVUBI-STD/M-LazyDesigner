import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { ALL_COMPATIBILITY_ROOT_FILES } from "./lib-domain-compatibility";

const SHARED_ROOT_IMPLEMENTATIONS = new Set([
  "constants.ts",
  "factories.ts",
]);

const CANONICAL_REEXPORT =
  /^export \* from "\.\/(?:animation|authoring|bedrock|blockbench|capabilities|core|geometry|particle|product|prompts|protocol|reference|runtime|schemas|texture|uv)\/[A-Za-z0-9_./-]+";$/;

function isCanonicalFacade(source: string): boolean {
  const lines = source.trim().split("\n").filter(Boolean);
  return lines.length > 0 && lines.every((line) => CANONICAL_REEXPORT.test(line));
}

describe("lib root ownership", () => {
  test("root contains only declared shared implementations or compatibility wrappers", async () => {
    const entries = await readdir("lib", { withFileTypes: true });
    const violations: string[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
      const source = await Bun.file(`lib/${entry.name}`).text();
      if (SHARED_ROOT_IMPLEMENTATIONS.has(entry.name)) continue;
      if (isCanonicalFacade(source) && ALL_COMPATIBILITY_ROOT_FILES.has(entry.name)) continue;
      violations.push(entry.name);
    }

    expect(violations).toEqual([]);
  });

  test("compatibility registry and shared-root allowlist have no stale entries", async () => {
    const existing = new Set(
      (await readdir("lib", { withFileTypes: true }))
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
    );

    const staleShared = [...SHARED_ROOT_IMPLEMENTATIONS].filter(
      (name) => !existing.has(name)
    );
    const staleCompatibility = [...ALL_COMPATIBILITY_ROOT_FILES].filter(
      (name) => !existing.has(name)
    );

    expect(staleShared).toEqual([]);
    expect(staleCompatibility).toEqual([]);
  });
});
