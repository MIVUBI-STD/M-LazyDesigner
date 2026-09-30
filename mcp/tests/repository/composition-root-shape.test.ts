import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";

const ALLOWED_GATEWAY_ROOT_IMPLEMENTATIONS = new Set([
  "index.ts",
]);

const ALLOWED_RUNTIME_ROOT_IMPLEMENTATIONS = new Set([
  "bootstrap.ts",
  "consolidatedRoutes.ts",
  "consolidatedTools.ts",
  "extensions.ts",
  "phaseControl.ts",
  "registration.ts",
]);

const THIN_FACADE = /^export \* from "\.\/[A-Za-z0-9_./-]+";\n$/;

async function unexpectedImplementations(
  dir: string,
  allowed: ReadonlySet<string>
): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const violations: string[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    if (entry.name.endsWith(".test.ts")) continue;
    if (allowed.has(entry.name)) continue;

    const source = await Bun.file(`${dir}/${entry.name}`).text();
    if (THIN_FACADE.test(source)) continue;
    violations.push(entry.name);
  }

  return violations.sort();
}

describe("composition root shape", () => {
  test("gateway root contains only public composition or thin facades", async () => {
    expect(
      await unexpectedImplementations(
        "gateway",
        ALLOWED_GATEWAY_ROOT_IMPLEMENTATIONS
      )
    ).toEqual([]);
  });

  test("server runtime root contains only core composition or thin facades", async () => {
    expect(
      await unexpectedImplementations(
        "server/runtime",
        ALLOWED_RUNTIME_ROOT_IMPLEMENTATIONS
      )
    ).toEqual([]);
  });
});
