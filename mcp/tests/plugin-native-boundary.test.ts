import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("Plugin native boundary", () => {
  test("plugin entrypoint delegates native network permission to RuntimeHost", async () => {
    const indexSource = await source("index.ts");
    const hostSource = await source("plugin/runtimeHost.ts");

    expect(indexSource).toContain("runtimeHost.acquireNativeNetwork(generation)");
    expect(indexSource).not.toContain("requireNativeModule(\"http\"");
    expect(hostSource).toContain("requireNativeModule(\"https\"");
    expect(hostSource).not.toContain("requireNativeModule(\"http\"");
  });

  test("Blockbench integration owns setup and teardown services", async () => {
    const integrationSource = await source("plugin/blockbenchIntegration.ts");

    expect(integrationSource).toContain("settingsSetup()");
    expect(integrationSource).toContain("registerReferenceModelsResource()");
    expect(integrationSource).toContain("await initPromptLoader()");
    expect(integrationSource).toContain("uiSetup({");
    expect(integrationSource).toContain("uiTeardown()");
    expect(integrationSource).toContain("settingsTeardown()");
  });
});
