import {
  CAPABILITY_SEMANTIC_CATALOG_REVISIONS,
  type CapabilitySemanticCatalogRevisions,
} from "../capabilities/semanticRegistry";
import {
  evaluateSemanticFreshnessForDimensions,
  semanticRevisionStamp,
  type SemanticFreshnessReport,
} from "./semanticFreshness";
import { semanticDependenciesForSurface } from "./semanticDependencyMatrix";

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
  stamp: Pick<SemanticDerivedArtifactStamp, "revisions" | "artifact_kind"> | null | undefined,
  expected: CapabilitySemanticCatalogRevisions =
    CAPABILITY_SEMANTIC_CATALOG_REVISIONS
): SemanticFreshnessReport {
  const kind = (stamp as { artifact_kind?: SemanticDerivedArtifactKind } | null | undefined)
    ?.artifact_kind;
  return evaluateSemanticFreshnessForDimensions(
    expected,
    stamp?.revisions,
    kind
      ? semanticDependenciesForSurface(kind)
      : ["routing", "graph", "schema_projection"]
  );
}
