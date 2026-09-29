import { describe, expect, test } from "bun:test";

const ALLOWED_BARE_COMMANDS = new Set([
  "check",
  "verify",
  "benchmark",
  "release",
  "typecheck",
  "test",
  "gateway",
  "dev",
  "build",
  "docs",
  "inspect",
]);

describe("package script taxonomy", () => {
  test("unnamespaced scripts are limited to stable developer facades", async () => {
    const packageJson = JSON.parse(await Bun.file("package.json").text()) as {
      scripts?: Record<string, string>;
    };
    const invalid = Object.keys(packageJson.scripts ?? {})
      .filter((name) => !name.includes(":") && !ALLOWED_BARE_COMMANDS.has(name))
      .sort();

    expect(invalid).toEqual([]);
  });
});
