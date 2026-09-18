import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

async function walk(root: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) out.push(...await walk(path));
    else if (/\.(?:ts|md|json|ya?ml)$/.test(entry.name)) out.push(path);
  }
  return out;
}

describe("retired runtime wiring paths", () => {
  test("canonical runtime extension owners replace retired wiring modules", async () => {
    expect(await Bun.file("server/runtime/extensions.ts").exists()).toBe(true);
    expect(await Bun.file("server/runtime/animationRuntimeContracts.ts").exists()).toBe(true);
    expect(await Bun.file("server/runtime/textureRuntimeContracts.ts").exists()).toBe(true);
    expect(await Bun.file("server/tools/paint-texture-transaction.ts").exists()).toBe(true);
  });

  test("active repository owners do not reference retired wiring filenames", async () => {
    const roots = ["server", "build", "tests", "../docs", "../.github"];
    const retired = [
      "server/tools/prelocal-wiring",
      "animation-runtime-wiring",
      "scripts/verify-prelocal-wiring-live",
      "verify:prelocal-wiring-live",
    ];

    const violations: string[] = [];
    for (const root of roots) {
      for (const file of await walk(root)) {
        if (file.endsWith("tests/repository/runtime-wiring-retirement.test.ts")) continue;
        if (file.endsWith("tests/fixtures/regression-cases.json")) continue;
        const body = await Bun.file(file).text();
        for (const token of retired) {
          if (body.includes(token)) violations.push(`${file}: ${token}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  test("active implementation and test paths do not use historical prelocal naming", async () => {
    const roots = ["server", "scripts", "tests"];
    const historical: string[] = [];
    for (const root of roots) {
      for (const file of await walk(root)) {
        if (file.toLowerCase().includes("prelocal")) historical.push(file);
      }
    }
    expect(historical).toEqual([]);
  });

});
