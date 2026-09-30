export const MIGRATED_COMPATIBILITY_WRAPPERS: Readonly<Record<string, string>> = {
  "animationContactEvidence.ts":
    'export * from "./animation/contactEvidence";\n',
  "animationControllerComposition.ts":
    'export * from "./animation/controllerComposition";\n',
  "animationCraftEvidence.ts":
    'export * from "./animation/craftEvidence";\n',
  "animationMolangSemantics.ts":
    'export * from "./animation/molangSemantics";\n',
  "animationQuality.ts": 'export * from "./animation/quality";\n',
  "bedrockAnimationSemantics.ts":
    'export * from "./animation/bedrockSemantics";\n',
  "rootMotionAnalysis.ts":
    'export * from "./animation/rootMotionAnalysis";\n',
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
  "boxUvLayout.ts": 'export * from "./uv/boxLayout";\n',
  "facePixelMapping.ts": 'export * from "./uv/facePixelMapping";\n',
  "orientedBoxContact.ts": 'export * from "./geometry/orientedBoxContact";\n',
  "blockbenchCubeObb.ts": 'export * from "./geometry/blockbenchCubeObb";\n',
  "cubeAmbientOcclusion.ts": 'export * from "./geometry/cubeAmbientOcclusion";\n',
  "cubeAoRuntime.ts": 'export * from "./geometry/cubeAoRuntime";\n',
  "renderedModelBounds.ts": 'export * from "./geometry/renderedModelBounds";\n',
  "paintStroke.ts": 'export * from "./texture/paintStroke";\n',
  "paintTransactionPolicy.ts": 'export * from "./texture/paintTransactionPolicy";\n',
  "paintTransaction.ts": 'export * from "./texture/paintTransaction";\n',
  "pbrMaterialMembership.ts": 'export * from "./texture/pbrMaterialMembership";\n',
  "textureOptimization.ts": 'export * from "./texture/optimization";\n',
  "texturePbrContent.ts": 'export * from "./texture/pbrContent";\n',
  "texturePixelCraft.ts": 'export * from "./texture/pixelCraft";\n',
  "textureProductionAlignment.ts": 'export * from "./texture/productionAlignment";\n',
  "textureTreatmentPlan.ts": 'export * from "./texture/treatmentPlan";\n',
  "textureVanillaKnowledge.ts": 'export * from "./texture/vanillaKnowledge";\n',
  "textureVariantPlan.ts": 'export * from "./texture/variantPlan";\n',
  "textureDiagnosticReadContext.ts": 'export * from "./texture/diagnosticReadContext";\n',
  "bedrockEntityRenderProfileBinding.ts": 'export * from "./texture/renderProfileBinding";\n',
  "binaryMaskMorphology.ts": 'export * from "./texture/binaryMaskMorphology";\n',
  "batchGroupRename.ts": 'export * from "./geometry/batchGroupRename";\n',
  "modelQuality.ts": 'export * from "./geometry/modelQuality";\n',
};

export const CANONICAL_COMPATIBILITY_WRAPPERS: Readonly<Record<string, string>> = {
  "productIdentity.ts": 'export * from "./product/productIdentity";\n',
  "resourceUri.ts": 'export * from "./protocol/resourceUri";\n',
  "validationVerdict.ts": 'export * from "./authoring/validationVerdict";\n',
  "authoringReadiness.ts": 'export * from "./authoring/authoringReadiness";\n',
  "bedrockProjectIdentity.ts": 'export * from "./bedrock/projectIdentity";\n',
  "bedrockProjectSemantics.ts": 'export * from "./bedrock/projectSemantics";\n',
  "runtimeConnection.ts": 'export * from "./runtime/connection";\n',
  "runtimeFetch.ts": 'export * from "./runtime/fetch";\n',
  "runtimeAffinity.ts": 'export * from "./runtime/affinity";\n',
  "runtimeLifecycle.ts": 'export * from "./runtime/lifecycle";\n',
};

export const ALL_COMPATIBILITY_WRAPPERS: Readonly<Record<string, string>> = {
  ...CANONICAL_COMPATIBILITY_WRAPPERS,
  ...MIGRATED_COMPATIBILITY_WRAPPERS,
};

export const COMPATIBILITY_ROOT_DOMAIN_FILES = new Set(
  Object.keys(MIGRATED_COMPATIBILITY_WRAPPERS)
);

export const COMPATIBILITY_ROOT_DOMAIN_IMPORTS = new Set(
  Object.keys(MIGRATED_COMPATIBILITY_WRAPPERS).map(
    (name) => `@/lib/${name.replace(/\.ts$/, "")}`
  )
);
