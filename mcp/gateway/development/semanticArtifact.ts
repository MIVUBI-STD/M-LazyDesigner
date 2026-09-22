import {
  CAPABILITY_SEMANTIC_CATALOG_REVISIONS,
  type CapabilitySemanticCatalogRevisions,
} from "../capabilities/semanticRegistry";
import {
  evaluateSemanticFreshness,
  semanticRevisionStamp,
  type SemanticFreshnessReport,
} from "./semanticFreshness";

export type SemanticDerivedArtifactKind =
  | "DOCS_API"
  | "DESCRIBE_REPORT"
  | "AI_STAGE_CONTEXT"
  | "CAPABILITY_MANIFEST";

export type SemanticDerivedArtifactStamp = {
  semantic_revision_schema: 1;
  artifact_kind: SemanticDerivedArtifactKind;
  revisions: CapabilitySemanticCatalogRevisions;
};

export function semanticDerivedArtifactStamp(
  artifactKind: SemanticDerivedArtifactKind,
  revisions: CapabilitySemanticCatalogRevisions =
    CAPABILITY_SEMANTIC_CATALOG_REVISIONS
): SemanticDerivedArtifactStamp {
  const base = semanticRevisionStamp(revisions);
  return {
    ...base,
    artifact_kind: artifactKind,
  };
}

export function evaluateDerivedArtifactFreshness(
  stamp: Pick<SemanticDerivedArtifactStamp, "revisions"> | null | undefined,
  expected: CapabilitySemanticCatalogRevisions =
    CAPABILITY_SEMANTIC_CATALOG_REVISIONS
): SemanticFreshnessReport {
  return evaluateSemanticFreshness(expected, stamp?.revisions);
}
