import { describe, expect, test } from "bun:test";

describe("Runtime core project boundary", () => {
  test("runtime compiler project excludes shell, UI, distribution and test tooling", async () => {
    const config = JSON.parse(
      await Bun.file("tsconfig.runtime-project.json").text()
    );

    expect(config.include).toContain("server/**/*.ts");
    expect(config.include).toContain("lib/**/*.ts");
    expect(config.include).not.toContain("plugin/**/*.ts");
    expect(config.include).not.toContain("ui/**/*.ts");
    expect(config.exclude).toEqual(
      expect.arrayContaining([
        "plugin/**",
        "ui/**",
        "distribution/**",
        "tests/**",
        "scripts/**",
        "build/**",
      ])
    );
  });

  test("Runtime transport consumes shared affinity from lib rather than Gateway facade", async () => {
    const net = await Bun.file("server/net.ts").text();
    const shared = await Bun.file("lib/runtimeAffinity.ts").text();
    const facade = await Bun.file("gateway/runtime/projectAffinity.ts").text();

    expect(net).toContain("@/lib/runtimeAffinity");
    expect(net).not.toContain("@/gateway/projectAffinity");
    expect(shared).toContain("BLOCKIT_PROJECT_AFFINITY_HEADER");
    expect(facade).toContain('export * from "../../lib/runtimeAffinity"');
  });
});
