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
  test("full MCP source gate discovers every Gateway test instead of a stale hand-picked subset", async () => {
    const packageJson = JSON.parse(
      await Bun.file("package.json").text()
    ) as { scripts?: Record<string, string> };
    const scripts = packageJson.scripts ?? {};
    expect(scripts["verify:full"]).toContain("bun run verify:mcp");
    expect(scripts["verify:mcp"]).toContain("bun run verify:contracts");
    expect(scripts["verify:contracts"]).toContain("bun test gateway/ lib/capabilities/manifest.test.ts");
    expect(scripts["verify:contracts"]).not.toContain("bun run test:gateway-structure");
    expect(scripts["verify:contracts"]).not.toContain("bun run test:gateway-recovery");
    expect(scripts["verify:contracts"]).not.toContain("bun run test:capability-manifest");
  });

});
