import { classifyMcpToolPhaseByName } from "../../lib/authoringPhase";
import {
  getCapabilityMetadata,
  type CapabilityMetadata,
} from "../../lib/capabilityMetadata";
import type { ControlAuthoringDomain } from "./types";

export type ControlCapabilityManifestEntry = CapabilityMetadata & {
  authoringDomain: ControlAuthoringDomain;
};

/**
 * Unified Gateway/Control projection of capability semantics.
 *
 * Runtime-owned execution/search/effect metadata remains in capabilityMetadata.
 * Control adds semantic authoring ownership here so routing consumers no longer
 * reconstruct domain classification independently.
 */
export function getControlCapabilityManifestEntry(
  name: string
): ControlCapabilityManifestEntry {
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
