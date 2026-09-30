import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

async function scriptFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await scriptFiles(path)));
    } else if (entry.isFile() && path.endsWith(".ts")) {
      files.push(relative("scripts", path).replace(/\\/g, "/"));
    }
  }
  return files;
}

describe("script entrypoint ownership", () => {
  test("every runnable script is named in package.json and helpers are explicitly owned", async () => {
    const pkg = JSON.parse(await Bun.file("package.json").text()) as {
      scripts: Record<string, string>;
    };
    const files = (await scriptFiles("scripts")).sort();

    const referenced = new Set<string>();
    for (const command of Object.values(pkg.scripts)) {
      for (const match of command.matchAll(
        /\.\/scripts\/([A-Za-z0-9._\/-]+\.ts)/g
      )) {
        referenced.add(match[1]!);
      }
    }

    const helpers = new Set(["verify/live-e2e-common.ts", "generate/internal/docs-manifest.ts"]);
    const unowned = files.filter(
      (name) => !referenced.has(name) && !helpers.has(name)
    );
    expect(unowned).toEqual([]);

    const scriptBodies = await Promise.all(
      files
        .filter((name) => !helpers.has(name))
        .map((name) => Bun.file(`scripts/${name}`).text())
    );
    expect(
      scriptBodies.some((body) => body.includes('./live-e2e-common'))
    ).toBe(true);
  });
});