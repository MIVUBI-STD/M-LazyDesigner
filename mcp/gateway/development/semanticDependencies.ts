import {
  CAPABILITY_SEMANTIC_CATALOG_REVISIONS,
  semanticFingerprint,
  type SemanticRevisionDimension,
} from "../capabilities/semanticRegistry";

export type SemanticDependencyOwner =
  | "AUTHORING_SPECIALIST"
  | "MODELLING_PROFILE"
  | "GENERIC_CONTEXT";

export const SEMANTIC_DEPENDENCY_POLICY: Readonly<
  Record<SemanticDependencyOwner, readonly SemanticRevisionDimension[]>
> = Object.freeze({
  AUTHORING_SPECIALIST: ["routing", "graph"],
  MODELLING_PROFILE: ["routing", "graph"],
  GENERIC_CONTEXT: ["routing"],
});

export function semanticDependenciesForOwner(
  owner: SemanticDependencyOwner
): SemanticRevisionDimension[] {
  return [...SEMANTIC_DEPENDENCY_POLICY[owner]];
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
