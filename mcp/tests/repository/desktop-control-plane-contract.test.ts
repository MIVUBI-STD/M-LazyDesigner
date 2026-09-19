import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("Desktop control-plane ownership", () => {
  test("Desktop depends on canonical compatibility and managed distribution owners", async () => {
    const [rust, app, cli, workflow] = await Promise.all([
      source("../apps/desktop/src-tauri/src/system_status.rs"),
      source("../apps/desktop/src/App.svelte"),
      source("distribution/cli.ts"),
      source("../.github/workflows/desktop-verify.yml"),
    ]);

    expect(rust).toContain('../../../../mcp/compatibility/blockbench.json');
    expect(rust).toContain('"update" | "recover" | "repair"');
    expect(app).toContain("'update' | 'recover' | 'repair'");
    for (const command of ["update", "recover", "repair", "status", "mcp"]) {
      expect(cli).toContain(command);
    }

    for (const dependency of [
      '"apps/desktop/**"',
      '"mcp/compatibility/blockbench.json"',
      '"mcp/distribution/**"',
    ]) expect(workflow).toContain(dependency);
  });

  test("Desktop verification includes source proof and a Windows installer smoke build", async () => {
    const workflow = await source("../.github/workflows/desktop-verify.yml");
    expect(workflow).toContain("npm run verify:source");
    expect(workflow).toContain("npm run build:app");
    expect(workflow).toContain("lazydesigner-desktop-windows-x64");
    expect(workflow).toContain("bundle/nsis/*.exe");
  });

  test("Desktop preserves client-owned Gateway semantics", async () => {
    const [rust, readme] = await Promise.all([
      source("../apps/desktop/src-tauri/src/system_status.rs"),
      source("../apps/desktop/README.md"),
    ]);

    expect(rust).toContain('ownership: "client-owned"');
    expect(readme).toContain("Desktop therefore does not launch, restart, terminate, or watchdog Gateway processes.");
    expect(readme).not.toContain("Start Gateway command");
  });
});
