import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { COMPATIBILITY_ROOT_DOMAIN_IMPORTS } from "./lib-domain-compatibility";

const DOMAIN_DIRS = [
  "lib/animation",
  "lib/authoring",
  "lib/authoringRecipe",
  "lib/geometry",
  "lib/orchestration",
  "lib/particle",
  "lib/rig",
  "lib/texture",
  "lib/uv",
] as const;

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

describe("domain dependency direction", () => {
  test("domain libraries do not depend on Runtime or Gateway composition", async () => {
    const violations: string[] = [];

    for (const dir of DOMAIN_DIRS) {
      for (const file of await sourceFiles(dir)) {
        const source = await Bun.file(file).text();
        for (const request of importsOf(source)) {
          const normalized = request.replace(/\\/g, "/");
          if (
            normalized.includes("/server/") ||
            normalized.includes("/gateway/") ||
            normalized.startsWith("@/server") ||
            normalized.startsWith("@/gateway")
          ) {
            violations.push(
              `${relative("lib", file).replace(/\\/g, "/")} -> ${request}`
            );
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  test("canonical domain code does not depend on migrated root wrappers", async () => {
    const violations: string[] = [];

    for (const dir of DOMAIN_DIRS) {
      for (const file of await sourceFiles(dir)) {
        const source = await Bun.file(file).text();
        for (const request of importsOf(source)) {
          if (COMPATIBILITY_ROOT_DOMAIN_IMPORTS.has(request)) {
            violations.push(
              `${relative("lib", file).replace(/\\/g, "/")} -> ${request}`
            );
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
