import { describe, expect, test } from "bun:test";

describe("root developer facade", () => {
  test("workspace exposes one thin MCP/Desktop command surface", async () => {
    const root = JSON.parse(await Bun.file("../package.json").text()) as {
      private?: boolean;
      scripts?: Record<string, string>;
    };

    expect(root.private).toBe(true);
    expect(root.scripts).toEqual({
      check: "bun run check:mcp && bun run check:desktop",
      "check:mcp": "bun --cwd mcp run check",
      "check:desktop": "npm --prefix apps/desktop run typecheck",
      verify: "bun run verify:mcp && bun run verify:desktop",
      "verify:mcp": "bun --cwd mcp run verify",
      "verify:desktop": "npm --prefix apps/desktop run verify:source",
      "dev:mcp": "bun --cwd mcp run dev:sync",
      "dev:desktop": "npm --prefix apps/desktop run dev:app",
      "build:mcp": "bun --cwd mcp run build",
      "build:desktop": "npm --prefix apps/desktop run build:app",
    });
  });

  test("root facade delegates instead of duplicating package implementation commands", async () => {
    const source = await Bun.file("../package.json").text();
    expect(source).not.toContain("./mcp/scripts/");
    expect(source).not.toContain("vite ");
    expect(source).not.toContain("cargo ");
    expect(source).not.toContain("tauri ");
  });
});
