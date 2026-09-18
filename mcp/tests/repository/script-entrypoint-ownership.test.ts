import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";

describe("script entrypoint ownership", () => {
  test("every runnable script is named in package.json and helpers are explicitly owned", async () => {
    const pkg = JSON.parse(await Bun.file("package.json").text()) as {
      scripts: Record<string, string>;
    };
    const files = (await readdir("scripts"))
      .filter((name) => name.endsWith(".ts"))
      .sort();

    const referenced = new Set<string>();
    for (const command of Object.values(pkg.scripts)) {
      for (const match of command.matchAll(/\.\/scripts\/([A-Za-z0-9._-]+\.ts)/g)) {
        referenced.add(match[1]);
      }
    }

    const helpers = new Set(["live-e2e-common.ts"]);
    const unowned = files.filter(
      (name) => !referenced.has(name) && !helpers.has(name)
    );
    expect(unowned).toEqual([]);

    const scriptBodies = await Promise.all(
      files
        .filter((name) => name !== "live-e2e-common.ts")
        .map((name) => Bun.file(`scripts/${name}`).text())
    );
    expect(
      scriptBodies.some((body) => body.includes('./live-e2e-common'))
    ).toBe(true);
  });
});
