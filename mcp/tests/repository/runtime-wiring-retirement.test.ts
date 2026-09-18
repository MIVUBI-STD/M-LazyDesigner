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
