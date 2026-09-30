import { authoringDomainForCapability } from "../context/authoring";
import {
  getCapabilityMetadata,
  type CapabilityMetadata,
} from "../../lib/capabilities/metadata";
import type { ControlAuthoringDomain } from "./types";

export type ControlCapabilityProjection = CapabilityMetadata & {
  authoringDomain: ControlAuthoringDomain;
};

/**
 * Control projection of canonical capability metadata.
 *
 * Capability-level metadata is canonical in lib/capabilities/manifest.ts via the
 * compatibility metadata adapter. Control adds only authoring-domain projection.
 */
export function getControlCapabilityProjection(
  name: string
): ControlCapabilityProjection {
  return {
    ...getCapabilityMetadata(name),
    authoringDomain: authoringDomainForCapability(name),
  };
}