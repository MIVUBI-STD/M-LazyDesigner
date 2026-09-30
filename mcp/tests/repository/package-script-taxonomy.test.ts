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

const ALLOWED_NAMESPACES = new Set([
  "analyze",
  "audit",
  "benchmark",
  "compare",
  "conformance",
  "deploy",
  "dev",
  "docs",
  "eval",
  "finalize",
  "generate",
  "measure",
  "plan",
  "prompts",
  "report",
  "security",
  "setup",
  "snapshot",
  "test",
  "typecheck",
  "verify",
]);

describe("package script taxonomy", () => {
  test("namespaced scripts use the canonical command taxonomy", async () => {
    const packageJson = JSON.parse(await Bun.file("package.json").text()) as {
      scripts?: Record<string, string>;
    };
    const invalid = Object.keys(packageJson.scripts ?? {})
      .filter((name) => name.includes(":"))
      .map((name) => name.split(":", 1)[0]!)
      .filter((namespace) => !ALLOWED_NAMESPACES.has(namespace))
      .sort();

    expect(invalid).toEqual([]);
    expect(packageJson.scripts?.["map:development"]).toBeUndefined();
    expect(packageJson.scripts?.["map:knowledge"]).toBeUndefined();
  });

  test("unnamespaced scripts are limited to stable developer facades", async () => {
    const packageJson = JSON.parse(await Bun.file("package.json").text()) as {
      scripts?: Record<string, string>;
    };
    const invalid = Object.keys(packageJson.scripts ?? {})
      .filter((name) => !name.includes(":") && !ALLOWED_BARE_COMMANDS.has(name))
      .sort();

    expect(invalid).toEqual([]);
  });
  test("namespaced commands do not create cross-namespace one-hop aliases", async () => {
    const packageJson = JSON.parse(await Bun.file("package.json").text()) as {
      scripts?: Record<string, string>;
    };
    const violations: string[] = [];

    for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
      if (!name.includes(":")) continue;
      const match = command.match(/^bun run ([A-Za-z0-9:_-]+)$/);
      if (!match) continue;

      const target = match[1]!;
      const sourceNamespace = name.split(":", 1)[0]!;
      const targetNamespace = target.includes(":")
        ? target.split(":", 1)[0]!
        : sourceNamespace;

      if (sourceNamespace !== targetNamespace) {
        violations.push(`${name} -> ${target}`);
      }
    }

    expect(violations).toEqual([]);
  });
  test("developer commands use canonical Stage terminology", async () => {
    const packageJson = JSON.parse(await Bun.file("package.json").text()) as {
      scripts?: Record<string, string>;
    };
    const scripts = packageJson.scripts ?? {};

    expect(scripts["measure:stages"]).toBe(
      "bun run ./scripts/measure-stage-surfaces.ts"
    );
    expect(scripts["measure:phases"]).toBeUndefined();
    expect(await Bun.file("scripts/measure-stage-surfaces.ts").exists()).toBe(true);
    expect(await Bun.file("scripts/measure-phase-surfaces.ts").exists()).toBe(false);
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