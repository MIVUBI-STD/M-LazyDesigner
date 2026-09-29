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

const MIGRATED_COMPATIBILITY_WRAPPERS: Readonly<Record<string, string>> = {
  "animationContactEvidence.ts":
    'export * from "./animation/contactEvidence";\n',
  "animationControllerComposition.ts":
    'export * from "./animation/controllerComposition";\n',
  "animationEasing.ts": 'export * from "./animation/easing";\n',
  "animationMotionDynamics.ts":
    'export * from "./animation/motionDynamics";\n',
  "animationPreviewState.ts":
    'export * from "./animation/previewState";\n',
  "bedrockAnimationRuntimeResources.ts": 'export * from "./animation/bedrockRuntimeResources";\n',
  "bedrockParticleBinding.ts": 'export * from "./particle/binding";\n',
  "bedrockParticleDocument.ts": 'export * from "./particle/document";\n',
  "bedrockParticleDocumentCore.ts": 'export * from "./particle/documentCore";\n',
  "bedrockParticlePackGraph.ts": 'export * from "./particle/packGraph";\n',
  "bedrockParticleSchemaCoverage.ts": 'export * from "./particle/schemaCoverage";\n',
  "bedrockParticleSemantics.ts": 'export * from "./particle/semantics";\n',
  "geometryQuality.ts": 'export * from "./geometry/quality";\n',
  "geometrySurfaceEvidence.ts":
    'export * from "./geometry/surfaceEvidence";\n',
  "particleResourceLayout.ts":
    'export * from "./particle/resourceLayout";\n',
  "particleWriteRevision.ts":
    'export * from "./particle/writeRevision";\n',
  "textureBitmapRuntime.ts":
    'export * from "./texture/bitmapRuntime";\n',
  "textureAlphaSemantics.ts":
    'export * from "./texture/alphaSemantics";\n',
  "textureColorEngine.ts": 'export * from "./texture/colorEngine";\n',
  "textureColorProfile.ts": 'export * from "./texture/colorProfile";\n',
  "textureComputePipeline.ts": 'export * from "./texture/computePipeline";\n',
  "textureComputeRequest.ts": 'export * from "./texture/computeRequest";\n',
  "textureEvidence.ts": 'export * from "./texture/evidence";\n',
  "textureEvidenceDelivery.ts": 'export * from "./texture/evidenceDelivery";\n',
  "textureFrameMapping.ts":
    'export * from "./texture/frameMapping";\n',
  "textureMaterialStatus.ts":
    'export * from "./texture/materialStatus";\n',
  "textureSeamContinuity.ts":
    'export * from "./texture/seamContinuity";\n',
  "textureSurfacePattern.ts":
    'export * from "./texture/surfacePattern";\n',
  "texturePalette.ts": 'export * from "./texture/palette";\n',
  "textureRenderProfile.ts":
    'export * from "./texture/renderProfile";\n',
  "textureRevision.ts": 'export * from "./texture/revision";\n',
  "uvPhysicalEvidence.ts": 'export * from "./uv/physicalEvidence";\n',
};

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

    // When a root compatibility path is finally retired, remove it from this
    // allowlist in the same change so the permitted legacy surface only shrinks.
    expect(stale).toEqual([]);
  });
});
