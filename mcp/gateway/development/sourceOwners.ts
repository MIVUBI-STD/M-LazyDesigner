import type { GatewayAuthoringDomain } from "../context/authoring";
import type { DevelopmentSourceOwner } from "./types";
import {
  ANIMATION_PATH,
  MODELLING_PATH,
  TEXTURING_PATH,
  authoringDomainForCapability as resolveAuthoringDomainForCapability,
} from "../context/authoring";
import { GEOMETRY_SOURCE_OWNERS } from "./sourceOwners/geometry";
import { TEXTURING_SOURCE_OWNERS } from "./sourceOwners/texturing";
import { ANIMATION_SOURCE_OWNERS } from "./sourceOwners/animation";
import { CORE_SOURCE_OWNERS } from "./sourceOwners/core";

const SOURCE_BY_CAPABILITY: Readonly<Record<string, DevelopmentSourceOwner>> = {
  ...GEOMETRY_SOURCE_OWNERS,
  ...TEXTURING_SOURCE_OWNERS,
  ...ANIMATION_SOURCE_OWNERS,
  ...CORE_SOURCE_OWNERS,
};

const DEFAULT_SOURCE_BY_DOMAIN: Record<GatewayAuthoringDomain, DevelopmentSourceOwner> = {
  GEOMETRY: {
    source: "mcp/server/runtime/registration.ts",
    specialist: MODELLING_PATH,
    anchor_test: "mcp/tests/authoring-phase-surface.test.ts",
    resolution: "FALLBACK",
  },
  TEXTURING: {
    source: "mcp/server/runtime/registration.ts",
    specialist: TEXTURING_PATH,
    anchor_test: "mcp/tests/authoring-phase-surface.test.ts",
    resolution: "FALLBACK",
  },
  ANIMATION: {
    source: "mcp/server/runtime/registration.ts",
    specialist: ANIMATION_PATH,
    anchor_test: "mcp/tests/authoring-phase-surface.test.ts",
    resolution: "FALLBACK",
  },
  CORE: {
    source: "mcp/server/runtime/registration.ts",
    specialist: null,
    anchor_test: "mcp/tests/gateway-contract.test.ts",
    resolution: "FALLBACK",
  },
};

export function authoringDomainForCapability(
  capability: string
): GatewayAuthoringDomain {
  return resolveAuthoringDomainForCapability(capability);
}

export function anchorTestForSourceOwner(
  owner: DevelopmentSourceOwner
): string | null {
  return owner.anchor_test;
}

function canonicalSourceOwner(owner: DevelopmentSourceOwner): DevelopmentSourceOwner {
  const anchorTest = anchorTestForSourceOwner(owner);
  return {
    source: owner.source,
    specialist: owner.specialist,
    anchor_test: anchorTest,
    ...(owner.resolution ? { resolution: owner.resolution } : {}),
  };
}

export function sourceOwnerForCapability(
  capability: string
): DevelopmentSourceOwner {
  return canonicalSourceOwner(
    SOURCE_BY_CAPABILITY[capability] ??
      DEFAULT_SOURCE_BY_DOMAIN[authoringDomainForCapability(capability)]
  );
}

export function listExplicitSourceOwners(): Readonly<
  Record<string, DevelopmentSourceOwner>
> {
  return Object.fromEntries(
    Object.entries(SOURCE_BY_CAPABILITY).map(([capability, owner]) => [
      capability,
      canonicalSourceOwner(owner),
    ])
  );
}
