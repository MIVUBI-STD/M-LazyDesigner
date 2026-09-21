import {
  getCapabilityCoreManifestEntry,
  type CapabilityEffects,
  type CapabilityExecutionClass,
  type CapabilityLifecycle,
  type CapabilityLifecycleStage,
  type CapabilityTier,
  type CapabilityVerificationClass,
} from "./capabilities/manifest";

export type {
  CapabilityEffects,
  CapabilityExecutionClass,
  CapabilityLifecycle,
  CapabilityLifecycleStage,
  CapabilityTier,
  CapabilityVerificationClass,
} from "./capabilities/manifest";

export type CapabilityMetadata = {
  tier: CapabilityTier;
  searchAliases: readonly string[];
  effects: CapabilityEffects;
  lifecycle: CapabilityLifecycle;
  executionClass: CapabilityExecutionClass;
  verificationClass: CapabilityVerificationClass;
};

const DEFAULT_EFFECTS: CapabilityEffects = {
  projectAffinity: "preserve",
  phaseAffinity: "preserve",
  invalidateCatalog: false,
};

const DEFAULT_LIFECYCLE: CapabilityLifecycle = {
  stage: "active",
  replacement: null,
};

export const CAPABILITY_TIER_BOOST: Readonly<Record<CapabilityTier, number>> = {
  primary: 20,
  support: 6,
  experimental: 0,
  maintenance: -20,
};

export function getCapabilityMetadata(name: string): CapabilityMetadata {
  const entry = getCapabilityCoreManifestEntry(name);
  return {
    tier: entry?.tier ?? "support",
    searchAliases: entry?.aliases ?? [],
    effects: entry?.effects ?? DEFAULT_EFFECTS,
    lifecycle: entry?.lifecycle ?? DEFAULT_LIFECYCLE,
    executionClass: entry?.executionClass ?? "normal",
    verificationClass: entry?.verificationClass ?? "not_applicable",
  };
}

export const CAPABILITY_LIFECYCLE_SEARCH_PENALTY: Readonly<
  Record<CapabilityLifecycleStage, number>
> = {
  active: 0,
  deprecated: -40,
};
