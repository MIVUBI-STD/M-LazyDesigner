import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

describe("semantic core dependency direction", () => {
  test("lib/semantic stays independent from Gateway and Runtime orchestration", async () => {
    const root = "lib/semantic";
    const files = (await readdir(root))
      .filter((name) => name.endsWith(".ts"))
      .map((name) => join(root, name));

    for (const file of files) {
      const source = await Bun.file(file).text();
      expect(source, file).not.toMatch(/from\s+["'][^"']*gateway\//);
      expect(source, file).not.toMatch(/from\s+["'][^"']*server\//);
      expect(source, file).not.toMatch(/from\s+["'][^"']*plugin\//);
    }
  });

  test("Gateway-specific semantic orchestration lives under gateway/development", async () => {
    for (const file of [
      "gateway/development/impact.ts",
      "gateway/development/affectedExecution.ts",
    ]) {
      expect(await Bun.file(file).exists(), file).toBe(true);
    }
  });
});
