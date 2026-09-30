import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const WRAPPERS: Readonly<Record<string,string>> = {
  "gateway/backend.ts": 'export * from "./runtime/backend";\n',
  "gateway/protocol.ts": 'export * from "./contracts/protocol";\n',
  "gateway/outputSchemas.ts": 'export * from "./contracts/outputSchemas";\n',
  "gateway/resultCompaction.ts": 'export * from "./presentation/resultCompaction";\n',
  "gateway/statusProjection.ts": 'export * from "./presentation/statusProjection";\n',
};

const INTENTIONAL_LIB_ROOT_OWNERS = new Set(["constants", "factories"]);

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await sourceFiles(path)));
    } else if (
      entry.isFile() &&
      path.endsWith(".ts") &&
      !path.endsWith(".test.ts")
    ) {
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

describe("gateway canonical ownership", () => {
  test("migrated root paths remain compatibility-only facades", async () => {
    for (const [path, expected] of Object.entries(WRAPPERS)) {
      expect(await Bun.file(path).text()).toBe(expected);
    }
  });

  test("Gateway production code bypasses lib root compatibility facades", async () => {
    const violations: string[] = [];

    for (const file of await sourceFiles("gateway")) {
      const source = await Bun.file(file).text();
      for (const request of importsOf(source)) {
        const match = request.match(/(?:^|\/)lib\/([A-Za-z0-9_-]+)$/);
        if (!match) continue;
        const owner = match[1]!;
        if (INTENTIONAL_LIB_ROOT_OWNERS.has(owner)) continue;
        violations.push(
          `${relative("gateway", file).replace(/\\/g, "/")} -> ${request}`
        );
      }
    }

    expect(violations).toEqual([]);
  });
});
