import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";

async function text(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("LazyDesigner Control source migration", () => {
  test("Control is the only active Gateway routing source path", async () => {
    expect(await Bun.file("gateway/control/index.ts").exists()).toBe(true);
    expect(await Bun.file("gateway/navigator/index.ts").exists()).toBe(false);
    expect(await Bun.file("gateway/navigator").exists()).toBe(false);

    const gateway = await text("gateway/index.ts");
    expect(gateway).toContain('from "./control"');
    expect(gateway).not.toContain('from "./navigator"');
    expect(gateway).toContain("buildControlPacket");
    expect(gateway).toContain("buildControlDelta");
  });

  test("canonical Control module exposes current protocol and no Navigator imports", async () => {
    const files = (await readdir("gateway/control", { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
      .map((entry) => `gateway/control/${entry.name}`);

    expect(files.length).toBeGreaterThan(0);
    let combined = "";
    for (const file of files) combined += `\n${await text(file)}`;

    expect(combined).toContain("lazydesigner-control-v1");
    expect(combined).not.toContain('from "./navigator"');
    expect(combined).not.toContain('from "../navigator"');
    expect(combined).not.toContain("blockit-navigator-v1");
  });

  test("regression and measurement owners use Control naming only", async () => {
    const testNames = (await readdir("tests", { withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);

    expect(testNames.some((name) => name.startsWith("gateway-control"))).toBe(true);
    expect(testNames.some((name) => name.startsWith("gateway-navigator"))).toBe(false);

    expect(await Bun.file("scripts/measure-control-context.ts").exists()).toBe(true);
    expect(await Bun.file("scripts/measure-navigator-context.ts").exists()).toBe(false);

    const packageJson = JSON.parse(await text("package.json")) as { scripts: Record<string, string> };
    expect(packageJson.scripts["measure:control"]).toBe("bun run ./scripts/measure-control-context.ts");
    expect(packageJson.scripts["measure:navigator"]).toBeUndefined();
  });

  test("source ownership docs point to canonical Control and keep Navigator retired", async () => {
    const [implementation, validation, next] = await Promise.all([
      text("../docs/04-system/implementation-map.md"),
      text("../docs/05-operations/current-validation.md"),
      text("../docs/05-operations/next-action.md"),
    ]);

    for (const owner of [implementation, validation, next]) {
      expect(owner).toContain("mcp/gateway/control/");
    }
    expect(implementation).toContain("Canonical source: `mcp/gateway/control/`");
    expect(implementation).not.toMatch(/canonical source:\s*`mcp\/gateway\/navigator\//i);
    expect(validation).toMatch(/Navigator active source path: removed/i);
    expect(next).toMatch(/former `mcp\/gateway\/navigator\/` source is removed/i);
    expect(next).toMatch(/no alias/i);
  });

  test("retired Navigator proposal stays out of the working tree", async () => {
    const experimental = await text("../Experimental/README.md");

    expect(experimental).toContain("mcp/gateway/control/");
    expect(experimental).toMatch(/former active `mcp\/gateway\/navigator\/` production path has been removed/i);
    expect(experimental).toMatch(/Navigator design context is retained in Git history only/i);
    expect(await Bun.file("../Experimental/blockit-navigator/README.md").exists()).toBe(false);
    expect(await Bun.file("../Experimental/blockit-navigator").exists()).toBe(false);
  });
});
