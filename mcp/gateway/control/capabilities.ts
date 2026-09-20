import type { CapabilitySummary } from "../contract";
import {
  authoringDomainForCapability,
  sourceOwnerForCapability,
} from "./registry";
import type {
  ControlAuthoringDomain,
  ControlCapabilitySummary,
} from "./types";

export function decorateCapabilities(
  capabilities: readonly CapabilitySummary[],
  currentDomain: ControlAuthoringDomain | null = null
): ControlCapabilitySummary[] {
  return capabilities.map((capability) => {
    const authoringDomain = authoringDomainForCapability(capability.capability_id);
    const domainKnown = currentDomain !== null;
    const current = domainKnown && (
      authoringDomain === "CORE" || authoringDomain === currentDomain
    );

    return {
      ...capability,
      control: {
        authoring_domain: authoringDomain,
        current_domain: current,
        eligibility: !domainKnown
          ? "AVAILABLE"
          : current
            ? authoringDomain === "CORE"
              ? "AVAILABLE"
              : "RECOMMENDED"
            : "FOREIGN_PHASE",
        source_owner: sourceOwnerForCapability(capability.capability_id),
      },
    };
  });
}


/**
 * Search runs without an orientation status read, so current_domain=false and
 * eligibility=AVAILABLE carry no decision signal. Keep the richer internal
 * decoration for policy/tests, but omit those constant fields at the AI-client
 * search boundary.
 */
export function projectCapabilitiesForSearch(
  capabilities: readonly ControlCapabilitySummary[]
) {
  return capabilities.map((capability) => ({
    capability_id: capability.capability_id,
    description: capability.description,
    tier: capability.tier,
    read_only: capability.read_only,
    destructive: capability.destructive,
    idempotent: capability.idempotent,
    control: {
      authoring_domain: capability.control.authoring_domain,
    },
  }));
}
