import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)));
    else if (entry.isFile() && path.endsWith(".ts")) files.push(path);
  }
  return files;
}

function importsOf(source: string): string[] {
  return [...source.matchAll(
    /(?:import[\s\S]*?from\s*|export\s+(?:\*|\{[\s\S]*?\})\s+from\s*)["']([^"']+)["']/g
  )].map((match) => match[1]!);
}

describe("authoring layer dependency direction", () => {
  test("authoring lifecycle truth is independent of recipe and orchestration", async () => {
    const violations: string[] = [];
    for (const file of await sourceFiles("lib/authoring")) {
      const source = await Bun.file(file).text();
      for (const request of importsOf(source)) {
        if (
          request.includes("/authoringRecipe/") ||
          request.includes("/orchestration/")
        ) {
          violations.push(
            `${relative("lib/authoring", file).replace(/\\/g, "/")} -> ${request}`
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });

  test("recipe semantics do not depend on orchestration", async () => {
    const violations: string[] = [];
    for (const file of await sourceFiles("lib/authoringRecipe")) {
      const source = await Bun.file(file).text();
      for (const request of importsOf(source)) {
        if (request.includes("/orchestration/")) {
          violations.push(
            `${relative("lib/authoringRecipe", file).replace(/\\/g, "/")} -> ${request}`
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });

  test("orchestration consumes shared contracts rather than Runtime executors", async () => {
    const violations: string[] = [];
    for (const file of await sourceFiles("lib/orchestration")) {
      const source = await Bun.file(file).text();
      for (const request of importsOf(source)) {
        if (
          request.startsWith("@/server") ||
          request.startsWith("@/gateway") ||
          request.includes("/server/") ||
          request.includes("/gateway/")
        ) {
          violations.push(
            `${relative("lib/orchestration", file).replace(/\\/g, "/")} -> ${request}`
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
