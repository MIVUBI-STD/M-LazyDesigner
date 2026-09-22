import { describe, expect, test } from "bun:test";

describe("Gateway shared TypeScript project", () => {
  test("shared runtime-neutral libraries have one composite compiler owner", async () => {
    const config = JSON.parse(
      await Bun.file("tsconfig.gateway-shared.json").text()
    );

    expect(config.compilerOptions.composite).toBe(true);
    expect(config.compilerOptions.emitDeclarationOnly).toBe(true);
    expect(config.compilerOptions.outDir).toBe(".cache/gateway-shared");
    expect(config.include).toEqual(
      expect.arrayContaining([
        "lib/runtimeFetch.ts",
        "lib/runtimeConnection.ts",
        "lib/capabilityMetadata.ts",
        "lib/capabilities/manifest.ts",
        "lib/authoringPhase.ts",
        "lib/registrationProfile.ts",
      ])
    );
  });
});
