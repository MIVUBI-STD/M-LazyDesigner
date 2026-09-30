import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (path.replace(/\\/g, "/").includes("/experimental")) continue;
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

function staticImports(source: string): string[] {
  return [...source.matchAll(
    /(?:import[\s\S]*?from\s*|export\s+(?:\*|\{[\s\S]*?\})\s+from\s*)["']([^"']+)["']/g
  )].map((match) => match[1]!);
}

describe("Gateway experimental dependency boundary", () => {
  test("stable Gateway source never statically imports experimental implementation", async () => {
    const violations: string[] = [];
    for (const file of await sourceFiles("gateway")) {
      const source = await Bun.file(file).text();
      for (const request of staticImports(source)) {
        if (request.includes("/experimental/") || request.startsWith("./experimental")) {
          violations.push(
            `${relative("gateway", file).replace(/\\/g, "/")} -> ${request}`
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });

  test("experimental implementation is loaded only by the Gateway composition root", async () => {
    const index = await Bun.file("gateway/index.ts").text();
    expect(index).toContain('await import("./experimental/hybridRegistration")');

    const files = await sourceFiles("gateway");
    const dynamicUsers: string[] = [];
    for (const file of files) {
      const source = await Bun.file(file).text();
      if (source.includes('import("./experimental/')) {
        dynamicUsers.push(relative("gateway", file).replace(/\\/g, "/"));
      }
    }
    expect(dynamicUsers).toEqual(["index.ts"]);
  });
});
