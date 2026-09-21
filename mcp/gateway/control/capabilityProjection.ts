import { classifyMcpToolPhaseByName } from "../../lib/authoringPhase";
import {
  getCapabilityMetadata,
  type CapabilityMetadata,
} from "../../lib/capabilityMetadata";
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
  const phase = classifyMcpToolPhaseByName(name);
  const authoringDomain: ControlAuthoringDomain =
    phase === "geometry"
      ? "GEOMETRY"
      : phase === "texturing"
        ? "TEXTURING"
        : phase === "animation"
          ? "ANIMATION"
          : "CORE";

  return {
    ...getCapabilityMetadata(name),
    authoringDomain,
  };
}
