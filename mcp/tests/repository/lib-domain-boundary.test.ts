import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";

const LEGACY_ROOT_DOMAIN_FILES = new Set([
  "animationContactEvidence.ts",
  "animationControllerComposition.ts",
  "animationCraftEvidence.ts",
  "animationEasing.ts",
  "animationMolangSemantics.ts",
  "animationMotionDynamics.ts",
  "animationPreviewState.ts",
  "animationQuality.ts",
  "bedrockAnimationRuntimeResources.ts",
  "bedrockAnimationSemantics.ts",
  "bedrockParticleBinding.ts",
  "bedrockParticleDocument.ts",
  "bedrockParticleDocumentCore.ts",
  "bedrockParticlePackGraph.ts",
  "bedrockParticleSchemaCoverage.ts",
  "bedrockParticleSemantics.ts",
  "geometryQuality.ts",
  "geometrySurfaceEvidence.ts",
  "particleResourceLayout.ts",
  "particleWriteRevision.ts",
  "rootMotionAnalysis.ts",
  "textureAlphaSemantics.ts",
  "textureBitmapRuntime.ts",
  "textureColorEngine.ts",
  "textureColorProfile.ts",
  "textureComputePipeline.ts",
  "textureComputeRequest.ts",
  "textureDiagnosticReadContext.ts",
  "textureEvidence.ts",
  "textureEvidenceDelivery.ts",
  "textureFrameMapping.ts",
  "textureMaterialStatus.ts",
  "textureOptimization.ts",
  "texturePalette.ts",
  "texturePbrContent.ts",
  "texturePixelCraft.ts",
  "textureProductionAlignment.ts",
  "textureRenderProfile.ts",
  "textureRevision.ts",
  "textureSeamContinuity.ts",
  "textureSurfacePattern.ts",
  "textureTreatmentPlan.ts",
  "textureVanillaKnowledge.ts",
  "textureVariantPlan.ts",
  "uvPhysicalEvidence.ts",
]);

const DOMAIN_PREFIX = /^(?:animation|geometry|particle|texture|uv)[A-Z].*\.ts$/;

describe("lib domain ownership ratchet", () => {
  test("migrated root paths stay compatibility-only wrappers", async () => {
    for (const [name, expected] of Object.entries(
      MIGRATED_COMPATIBILITY_WRAPPERS
    )) {
      expect(await Bun.file(`lib/${name}`).text()).toBe(expected);
    }
  });

  test("new domain implementation does not accumulate at lib root", async () => {
    const entries = await readdir("lib", { withFileTypes: true });
    const rootDomainFiles = entries
      .filter((entry) => entry.isFile() && DOMAIN_PREFIX.test(entry.name))
      .map((entry) => entry.name)
      .sort();

    const unexpected = rootDomainFiles.filter(
      (name) => !LEGACY_ROOT_DOMAIN_FILES.has(name)
    );

    expect(unexpected).toEqual([]);
  });

  test("legacy allowlist only names files that still exist", async () => {
    const entries = new Set(
      (await readdir("lib", { withFileTypes: true }))
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
    );

    const stale = [...LEGACY_ROOT_DOMAIN_FILES].filter(
      (name) => !entries.has(name)
    );

    // When a legacy root file is migrated, remove it from this allowlist in
    // the same change. This makes the ratchet shrink rather than become stale.
    expect(stale).toEqual([]);
  });
});
