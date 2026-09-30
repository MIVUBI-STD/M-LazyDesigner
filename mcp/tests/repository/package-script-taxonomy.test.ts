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
  test("script names do not duplicate the same command body", async () => {
    const packageJson = JSON.parse(await Bun.file("package.json").text()) as {
      scripts?: Record<string, string>;
    };
    const seen = new Map<string, string>();
    const duplicates: string[] = [];

    for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
      const existing = seen.get(command);
      if (existing) duplicates.push(`${existing} = ${name}`);
      else seen.set(command, name);
    }

    expect(duplicates).toEqual([]);
  });
});
