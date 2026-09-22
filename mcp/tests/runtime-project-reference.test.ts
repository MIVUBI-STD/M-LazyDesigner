import { describe, expect, test } from "bun:test";

describe("Runtime TypeScript project reference", () => {
  test("runtime product source is isolated from tests, scripts and docs tooling", async () => {
    const runtime = JSON.parse(
      await Bun.file("tsconfig.runtime-project.json").text()
    );

    expect(runtime.compilerOptions.composite).toBe(true);
    expect(runtime.compilerOptions.emitDeclarationOnly).toBe(true);
    expect(runtime.compilerOptions.outDir).toBe(".cache/runtime-project");
    expect(runtime.references).toEqual([
      { path: "./tsconfig.semantic-core.json" },
      { path: "./tsconfig.gateway-shared.json" },
    ]);
    expect(runtime.include).toContain("server/**/*.ts");
    expect(runtime.include).toContain("plugin/**/*.ts");
    expect(runtime.exclude).toEqual(
      expect.arrayContaining([
        "gateway/**",
        "tests/**",
        "scripts/**",
        "build/**",
        "lib/semantic/**",
      ])
    );
  });

  test("solution graph contains both product boundaries", async () => {
    const graph = JSON.parse(
      await Bun.file("tsconfig.project-graph.json").text()
    );
    expect(graph.references).toContainEqual({
      path: "./tsconfig.runtime-project.json",
    });
    expect(graph.references).toContainEqual({
      path: "./gateway/tsconfig.project.json",
    });
  });
});
