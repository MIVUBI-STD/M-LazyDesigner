import type { ControlAuthoringDomain, ControlSourceOwner } from "../control/types";
import {
  MODELLING_PATH,
  TEXTURING_PATH,
  ANIMATION_PATH,
} from "../control/contexts";
import { getControlCapabilityProjection } from "../control/capabilityProjection";
import { GEOMETRY_SOURCE_OWNERS } from "./sourceOwners/geometry";
import { TEXTURING_SOURCE_OWNERS } from "./sourceOwners/texturing";
import { ANIMATION_SOURCE_OWNERS } from "./sourceOwners/animation";
import { CORE_SOURCE_OWNERS } from "./sourceOwners/core";

const SOURCE_BY_CAPABILITY: Readonly<Record<string, ControlSourceOwner>> = {
  ...GEOMETRY_SOURCE_OWNERS,
  ...TEXTURING_SOURCE_OWNERS,
  ...ANIMATION_SOURCE_OWNERS,
  ...CORE_SOURCE_OWNERS,
};

const DEFAULT_SOURCE_BY_DOMAIN: Record<ControlAuthoringDomain, ControlSourceOwner> = {
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
): ControlAuthoringDomain {
  return getControlCapabilityProjection(capability).authoringDomain;
}

export function anchorTestForSourceOwner(
  owner: ControlSourceOwner
): string | null {
  return owner.anchor_test;
}

function canonicalSourceOwner(owner: ControlSourceOwner): ControlSourceOwner {
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
): ControlSourceOwner {
  return canonicalSourceOwner(
    SOURCE_BY_CAPABILITY[capability] ??
      DEFAULT_SOURCE_BY_DOMAIN[authoringDomainForCapability(capability)]
  );
}

export function listExplicitSourceOwners(): Readonly<
  Record<string, ControlSourceOwner>
> {
  return Object.fromEntries(
    Object.entries(SOURCE_BY_CAPABILITY).map(([capability, owner]) => [
      capability,
      canonicalSourceOwner(owner),
    ])
  );
}
