export {
  SEMANTIC_DEPENDENCY_MATRIX,
  semanticDependenciesForSurface,
  semanticRefreshSurfacesForDimensions,
  semanticSurfacesAffectedByDimensions,
} from "../capabilities/semanticDependencyMatrix";
export type {
  SemanticDependencySurface,
  SemanticRefreshSurface,
} from "../capabilities/semanticDependencyMatrix";

import {
  semanticSurfacesAffectedByDimensions,
  type SemanticDependencySurface,
} from "../capabilities/semanticDependencyMatrix";
import type { SemanticRevisionDimension } from "../capabilities/semanticRegistry";

export type SemanticVerificationCheck =
  | "CAPABILITY_INTELLIGENCE"
  | "DECISION_EFFICIENCY"
  | "CAPABILITY_MANIFEST"
  | "DESCRIBE_PAYLOADS";

const SEMANTIC_VERIFICATION_CHECKS: Readonly<
  Partial<Record<SemanticDependencySurface, readonly SemanticVerificationCheck[]>>
> = Object.freeze({
  CAPABILITY_SEARCH: ["CAPABILITY_INTELLIGENCE", "DECISION_EFFICIENCY"],
  PRECONDITION_GRAPH: ["DECISION_EFFICIENCY", "CAPABILITY_MANIFEST"],
  AI_CONTEXT: ["DECISION_EFFICIENCY"],
  DESCRIBE_SCHEMA: ["CAPABILITY_MANIFEST", "DESCRIBE_PAYLOADS"],
  DESCRIBE_REPORT: ["DESCRIBE_PAYLOADS"],
  CAPABILITY_MANIFEST: ["CAPABILITY_MANIFEST"],
});

export function semanticVerificationChecksForSurfaces(
  surfaces: readonly SemanticDependencySurface[]
): SemanticVerificationCheck[] {
  const checks = surfaces.flatMap(
    (surface) => SEMANTIC_VERIFICATION_CHECKS[surface] ?? []
  );
  return [...new Set(checks)].sort((a, b) => a.localeCompare(b));
}

export function semanticVerificationChecksForDimensions(
  dimensions: readonly SemanticRevisionDimension[]
): SemanticVerificationCheck[] {
  return semanticVerificationChecksForSurfaces(
    semanticSurfacesAffectedByDimensions(dimensions)
  );
}
