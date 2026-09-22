import {
  CAPABILITY_SEMANTIC_CATALOG_REVISIONS,
  semanticFingerprint,
  type SemanticRevisionDimension,
} from "../capabilities/semanticRegistry";
import {
  semanticDependenciesForSurface,
  type SemanticDependencySurface,
} from "./semanticDependencyMatrix";

export const SEMANTIC_DEPENDENCY_POLICY = Object.freeze({
  AUTHORING_SPECIALIST: semanticDependenciesForSurface("AUTHORING_SPECIALIST"),
  MODELLING_PROFILE: semanticDependenciesForSurface("MODELLING_PROFILE"),
  GENERIC_CONTEXT: semanticDependenciesForSurface("GENERIC_CONTEXT"),
});

export type SemanticDependencyOwner = Extract<
  SemanticDependencySurface,
  "AUTHORING_SPECIALIST" | "MODELLING_PROFILE" | "GENERIC_CONTEXT"
>;

export function semanticDependenciesForOwner(
  owner: SemanticDependencyOwner
): SemanticRevisionDimension[] {
  return semanticDependenciesForSurface(owner);
}

export function semanticRevisionForDependencies(
  dependencies: readonly SemanticRevisionDimension[]
): string {
  const unique = [...new Set(dependencies)].sort((a, b) =>
    a.localeCompare(b)
  );
  return semanticFingerprint(
    Object.fromEntries(
      unique.map((dimension) => [
        dimension,
        CAPABILITY_SEMANTIC_CATALOG_REVISIONS[dimension],
      ])
    )
  );
}
