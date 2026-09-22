import {
  CAPABILITY_BRANCH_MANIFEST,
  type CapabilityBranchManifestEntry,
} from "./manifest";
import {
  semanticDerivedArtifactStamp,
  type SemanticDerivedArtifactStamp,
} from "../development/semanticArtifact";

export type CapabilityManifestSnapshot = {
  semantic: SemanticDerivedArtifactStamp;
  entries: readonly CapabilityBranchManifestEntry[];
};

export function capabilityManifestSnapshot(): CapabilityManifestSnapshot {
  return {
    semantic: semanticDerivedArtifactStamp("CAPABILITY_MANIFEST"),
    entries: CAPABILITY_BRANCH_MANIFEST,
  };
}
