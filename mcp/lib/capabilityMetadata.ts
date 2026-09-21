// Compatibility facade. Capability semantics live in capabilityManifest.ts.
export {
  CAPABILITY_LIFECYCLE_SEARCH_PENALTY,
  CAPABILITY_TIER_BOOST,
  getCapabilityManifestEntry,
  getCapabilityMetadata,
} from "./capabilityManifest";
export type {
  CapabilityAuthoringDomain,
  CapabilityEffects,
  CapabilityExecutionClass,
  CapabilityLifecycle,
  CapabilityLifecycleStage,
  CapabilityManifestEntry,
  CapabilityMetadata,
  CapabilityTier,
  CapabilityVerificationClass,
} from "./capabilityManifest";
