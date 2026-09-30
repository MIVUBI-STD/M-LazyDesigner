import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const WRAPPERS: Readonly<Record<string,string>> = {
  "server/runtime/animationRuntimeContracts.ts": 'export * from "./contracts/animation";\n',
  "server/runtime/textureRuntimeContracts.ts": 'export * from "./contracts/texture";\n',
  "server/runtime/authoringRecipeOwnership.ts": 'export * from "./recipes/authoring/ownership";\n',
  "server/runtime/authoringRecipeRuntime.ts": 'export * from "./recipes/authoring/runtime";\n',
  "server/runtime/authoringRecipeService.ts": 'export * from "./recipes/authoring/service";\n',
  "server/runtime/materialRecipeRuntime.ts": 'export * from "./recipes/material/runtime";\n',
  "server/runtime/semanticUvRuntime.ts": 'export * from "./uv/semanticRuntime";\n',
  "server/runtime/uvLayoutRuntime.ts": 'export * from "./uv/layoutRuntime";\n',
  "server/runtime/uvLayoutService.ts": 'export * from "./uv/layoutService";\n',
};

describe("runtime canonical ownership", () => {
  test("migrated root paths remain compatibility-only facades", async () => {
    for (const [path, expected] of Object.entries(WRAPPERS)) {
      expect(await Bun.file(path).text()).toBe(expected);
    }
  });
});


async function runtimeSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await runtimeSourceFiles(path)));
    else if (entry.isFile() && path.endsWith(".ts") && !path.endsWith(".test.ts")) {
      files.push(path);
    }
  }
  return files;
}

function runtimeImportsOf(source: string): string[] {
  return [...source.matchAll(
    /(?:import[\s\S]*?from\s*|export\s+(?:\*|\{[\s\S]*?\})\s+from\s*)["']([^"']+)["']/g
  )].map((match) => match[1]!);
}

test("production Runtime code bypasses migrated root wrappers", async () => {
  const wrapperNames = new Set(
    Object.keys(WRAPPERS).map((path) =>
      path.slice("server/runtime/".length).replace(/\.ts$/, "")
    )
  );
  const violations: string[] = [];

  for (const file of await runtimeSourceFiles("server")) {
    const normalizedFile = file.replace(/\\/g, "/");
    if (
      normalizedFile.startsWith("server/runtime/") &&
      wrapperNames.has(
        normalizedFile
          .slice("server/runtime/".length)
          .replace(/\.ts$/, "")
      )
    ) {
      continue;
    }

    const source = await Bun.file(file).text();
    for (const request of runtimeImportsOf(source)) {
      const normalized = request.replace(/\\/g, "/");
      const alias = normalized.match(/^@\/server\/runtime\/([^/]+)$/);
      const relativeImport = normalized.match(
        /^(?:\.\/|\.\.\/runtime\/)([^/]+)$/
      );
      const name = alias?.[1] ?? relativeImport?.[1] ?? null;
      if (name && wrapperNames.has(name)) {
        violations.push(
          `${relative("server", file).replace(/\\/g, "/")} -> ${request}`
        );
      }
    }
  }

  expect(violations).toEqual([]);
});
