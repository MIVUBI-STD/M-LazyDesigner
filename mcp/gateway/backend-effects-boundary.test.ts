import { describe, expect, test } from "bun:test";

const backendSource = await Bun.file(new URL("./runtime/backend.ts", import.meta.url)).text();

describe("Gateway capability effect boundary", () => {
  test("backend routes affinity changes through declarative metadata", () => {
    expect(backendSource).toContain("resolveGatewayCapabilityEffects");
    expect(backendSource).toContain("getCapabilityMetadata(capability)");
  });

  test("backend does not branch on canonical capability names", () => {
    expect(backendSource).not.toContain('capability === "create_project"');
    expect(backendSource).not.toContain('capability === "switch_authoring_phase"');
    expect(backendSource).not.toContain('capability !== "switch_authoring_phase"');
  });

  test("runtime generation change hook fires only after a previously-ready session reconnects", () => {
    const connectStart = backendSource.indexOf(
      "private async connectFreshUnsafe"
    );
    const connectEnd = backendSource.indexOf(
      "private async ensureCatalogUnsafe",
      connectStart
    );
    const connectSource = backendSource.slice(connectStart, connectEnd);

    expect(connectSource).toContain(
      "const hadReadyRuntime = this.connection.session.hasBeenReady()"
    );
    expect(connectSource).toContain(
      'this.connection.markReady({ catalogRefreshed: true })'
    );
    expect(connectSource).toContain("if (hadReadyRuntime)");
    expect(connectSource).toContain("this.onRuntimeGenerationChange?.({");

    expect(
      connectSource.indexOf("this.onRuntimeGenerationChange?.({")
    ).toBeGreaterThan(
      connectSource.indexOf(
        'this.connection.markReady({ catalogRefreshed: true })'
      )
    );
  });
});
