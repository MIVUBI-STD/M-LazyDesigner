import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const MIGRATED_TOOL_WRAPPERS: Readonly<Record<string, string>> = {
  "animation-shared.ts": 'export * from "./animation/shared";\n',
  "animation-controller-state.ts":
    'export * from "./animation/controllerState";\n',
  "animation-effect-state.ts":
    'export * from "./animation/effectState";\n',
};

const MIGRATED_TOOL_IMPORTS = new Set(
  Object.keys(MIGRATED_TOOL_WRAPPERS).map(
    (name) => `@/server/tools/${name.replace(/\.ts$/, "")}`
  )
);

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await sourceFiles(path)));
    } else if (entry.isFile() && path.endsWith(".ts")) {
      files.push(path);
    }
  }
  return files;
}

function importsOf(source: string): string[] {
  return [...source.matchAll(
    /(?:import[\s\S]*?from\s*|export\s+(?:\*|\{[\s\S]*?\})\s+from\s*)["']([^"']+)["']/g
  )].map((match) => match[1]!);
}

describe("server tool domain ownership", () => {
  test("migrated root tool paths remain compatibility-only wrappers", async () => {
    for (const [name, expected] of Object.entries(MIGRATED_TOOL_WRAPPERS)) {
      expect(await Bun.file(`server/tools/${name}`).text()).toBe(expected);
    }
  });

  test("animation production modules do not depend on migrated root wrappers", async () => {
    const files = await sourceFiles("server/tools");
    const violations: string[] = [];

    for (const file of files) {
      if (file.endsWith("animation-shared.ts")) continue;
      const source = await Bun.file(file).text();
      for (const request of importsOf(source)) {
        const relativeLegacy =
          request === "./animation-shared" ||
          request === "./animation-controller-state" ||
          request === "./animation-effect-state";
        if (
          relativeLegacy ||
          MIGRATED_TOOL_IMPORTS.has(request)
        ) {
          violations.push(
            `${relative("server/tools", file).replace(/\\/g, "/")} -> ${request}`
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  test("animation domain owner does not depend on higher Runtime composition", async () => {
    for (const file of await sourceFiles("server/tools/animation")) {
      const source = await Bun.file(file).text();
      for (const request of importsOf(source)) {
        expect(request).not.toContain("/server/runtime");
        expect(request).not.toContain("/gateway/");
      }
    }
  });
});
