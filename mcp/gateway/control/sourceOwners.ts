import type { ControlAuthoringDomain, ControlSourceOwner } from "./types";
import {
  MODELLING_PATH,
  TEXTURING_PATH,
  ANIMATION_PATH,
} from "./contexts";
import { getControlCapabilityProjection } from "./capabilityProjection";
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
    test_owner: "mcp/tests/authoring-phase-surface.test.ts",
  },
  TEXTURING: {
    source: "mcp/server/runtime/registration.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/authoring-phase-surface.test.ts",
  },
  ANIMATION: {
    source: "mcp/server/runtime/registration.ts",
    specialist: ANIMATION_PATH,
    test_owner: "mcp/tests/authoring-phase-surface.test.ts",
  },
  CORE: {
    source: "mcp/server/runtime/registration.ts",
    specialist: null,
    test_owner: "mcp/tests/gateway-contract.test.ts",
  },
};

export function authoringDomainForCapability(
  capability: string
): ControlAuthoringDomain {
  return getControlCapabilityProjection(capability).authoringDomain;
}

export function sourceOwnerForCapability(
  capability: string
): ControlSourceOwner {
  return (
    SOURCE_BY_CAPABILITY[capability] ??
    DEFAULT_SOURCE_BY_DOMAIN[authoringDomainForCapability(capability)]
  );
}

export function listExplicitSourceOwners(): Readonly<
  Record<string, ControlSourceOwner>
> {
  return SOURCE_BY_CAPABILITY;
}
