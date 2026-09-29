import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";

const SHARED_ROOT_IMPLEMENTATIONS = new Set([
  "assetDependencyGraph.ts",
  "assetHealth.ts",
  "authoringPhase.ts",
  "authoringReadiness.ts",
  "bedrockExportIntegrity.ts",
  "bedrockExportWritePolicy.ts",
  "bedrockProjectIdentity.ts",
  "bedrockProjectSemantics.ts",
  "blockbenchCompatibility.ts",
  "capabilityMetadata.ts",
  "constants.ts",
  "coreIdentity.ts",
  "correctionSolver.ts",
  "efficiencyScorecard.ts",
  "elementSemanticScopes.ts",
  "factories.ts",
  "jsonValue.ts",
  "minecraftStyleEvidence.ts",
  "molangQueryCatalog.ts",
  "molangSyntax.ts",
  "productIdentity.ts",
  "promptContract.ts",
  "promptLoader.ts",
  "referenceCorrection.ts",
  "referenceCrossViewEvidence.ts",
  "registrationProfile.ts",
  "resourceUri.ts",
  "runtimeAffinity.ts",
  "runtimeConnection.ts",
  "runtimeFetch.ts",
  "runtimeLifecycle.ts",
  "semanticHistory.ts",
  "surfaceManifest.ts",
  "util.ts",
  "validationVerdict.ts",
  "zodObjects.ts",
]);

const DOMAIN_WRAPPER =
  /^export \* from "\.\/(?:animation|geometry|particle|texture|uv)\/[A-Za-z0-9_./-]+";\n$/;

describe("lib root ownership", () => {
  test("root contains only declared shared implementations or compatibility wrappers", async () => {
    const entries = await readdir("lib", { withFileTypes: true });
    const violations: string[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
      const source = await Bun.file(`lib/${entry.name}`).text();
      if (DOMAIN_WRAPPER.test(source)) continue;
      if (SHARED_ROOT_IMPLEMENTATIONS.has(entry.name)) continue;
      violations.push(entry.name);
    }

    expect(violations).toEqual([]);
  });

  test("shared-root allowlist has no stale entries", async () => {
    const existing = new Set(
      (await readdir("lib", { withFileTypes: true }))
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
    );

    const stale = [...SHARED_ROOT_IMPLEMENTATIONS].filter(
      (name) => !existing.has(name)
    );

    expect(stale).toEqual([]);
  });
});
