import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const PRODUCTION_DIRS = [
  "gateway",
  "lib",
  "plugin",
  "server",
  "ui",
] as const;

const TOOLING_SEGMENTS = [
  "/benchmarks/",
  "/build/",
  "/distribution/",
  "/scripts/",
] as const;

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)));
    else if (entry.isFile() && /\.(?:ts|tsx)$/.test(path)) files.push(path);
  }
  return files;
}

function importsOf(source: string): string[] {
  return [...source.matchAll(
    /(?:import[\s\S]*?from\s*|export\s+(?:\*|\{[\s\S]*?\})\s+from\s*)["']([^"']+)["']/g
  )].map((match) => match[1]!);
}

describe("tooling dependency direction", () => {
  test("production source never imports build, script, benchmark, or distribution tooling", async () => {
    const violations: string[] = [];

    for (const dir of PRODUCTION_DIRS) {
      for (const file of await sourceFiles(dir)) {
        const source = await Bun.file(file).text();
        for (const request of importsOf(source)) {
          const normalized = request.replace(/\\/g, "/");
          if (TOOLING_SEGMENTS.some((segment) => normalized.includes(segment))) {
            violations.push(
              `${relative(".", file).replace(/\\/g, "/")} -> ${request}`
            );
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
