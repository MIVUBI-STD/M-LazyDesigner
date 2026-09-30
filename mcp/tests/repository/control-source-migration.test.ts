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

    const [gateway, registration, executor] = await Promise.all([
      text("gateway/index.ts"),
      text("gateway/handlers/registerCoreTools.ts"),
      text("gateway/runtime/capabilityExecutor.ts"),
    ]);
    expect(registration).toContain('from "../control"');
    expect(executor).toContain('from "../control"');
    expect(gateway).not.toContain('from "./navigator"');
    expect(registration).toContain("buildControlPacket");
    expect(executor).toContain("buildControlDelta");
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

    expect(await Bun.file("scripts/measure/measure-control-context.ts").exists()).toBe(true);
    expect(await Bun.file("scripts/measure/measure-navigator-context.ts").exists()).toBe(false);

    const packageJson = JSON.parse(await text("package.json")) as { scripts: Record<string, string> };
    expect(packageJson.scripts["measure:control"]).toBe("bun run ./scripts/measure/measure-control-context.ts");
    expect(packageJson.scripts["measure:navigator"]).toBeUndefined();
  });

  test("architecture docs keep product Control and development ownership separate while Navigator stays retired", async () => {
    const [implementation, validation, next] = await Promise.all([
      text("../docs/04-system/implementation-map.md"),
      text("../docs/05-operations/current-validation.md"),
      text("../docs/05-operations/next-action.md"),
    ]);

    expect(implementation).toContain("Canonical source: `mcp/gateway/control/`");
    expect(implementation).toContain("Canonical source: `mcp/gateway/development/`");
    expect(validation).toContain("mcp/gateway/control/");
    expect(validation).toContain("mcp/gateway/development/");
    expect(next).toMatch(/Control|Gateway/i);
    expect(implementation).not.toMatch(/canonical source:\s*`mcp\/gateway\/navigator\//i);
    expect(validation).toMatch(/retired Navigator source remains removed/i);
  });

  test("retired Navigator proposal stays out of the working tree", async () => {
    const experimental = await text("../experiments/README.md");

    expect(experimental).toContain("mcp/gateway/control/");
    expect(experimental).toMatch(/former active `mcp\/gateway\/navigator\/` production path has been removed/i);
    expect(experimental).toMatch(/Navigator design context is retained in Git history only/i);
    expect(await Bun.file("../experiments/blockit-navigator/README.md").exists()).toBe(false);
    expect(await Bun.file("../experiments/blockit-navigator").exists()).toBe(false);
  });
});
