import { describe, expect, test } from "bun:test";

describe("semantic core TypeScript project boundary", () => {
  test("solution references a composite declaration-only semantic core", async () => {
    const solution = JSON.parse(
      await Bun.file("tsconfig.semantic-solution.json").text()
    );
    const core = JSON.parse(
      await Bun.file("tsconfig.semantic-core.json").text()
    );

    expect(solution.files).toEqual([]);
    expect(solution.references).toEqual([
      { path: "./tsconfig.semantic-core.json" },
    ]);
    expect(core.compilerOptions.composite).toBe(true);
    expect(core.compilerOptions.emitDeclarationOnly).toBe(true);
    expect(core.compilerOptions.outDir).toBe(".cache/semantic-core");
    expect(core.compilerOptions.declarationMap).toBe(true);
    expect(core.include).toContain("lib/semantic/canonical.ts");
    expect(core.include).not.toContain("gateway/**/*.ts");
  });

  test("MCP verification exercises the semantic project graph", async () => {
    const pkg = JSON.parse(await Bun.file("package.json").text());
    expect(pkg.scripts["verify:semantic-core"]).toContain(
      "tsc -b tsconfig.semantic-solution.json"
    );
    expect(pkg.scripts["verify:mcp"]).toContain(
      "bun run verify:semantic-core"
    );
  });
});
