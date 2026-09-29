import { describe, expect, test } from "bun:test";

describe("developer command facade", () => {
  test("stable top-level commands remain available", async () => {
    const packageJson = JSON.parse(
      await Bun.file("package.json").text()
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.check).toBe(
      "bun run verify:repository && bun run typecheck && bun run typecheck:gateway"
    );
    expect(packageJson.scripts?.verify).toBe("bun run verify:full");
    expect(packageJson.scripts?.benchmark).toBe("bun run verify:benchmarks");
    expect(packageJson.scripts?.release).toBe("bun run verify:release");
  });
});
