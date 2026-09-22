import type { SemanticRevisionDimension } from "../capabilities/semanticRegistry";

export type SemanticDependencySurface =
  | "AUTHORING_SPECIALIST"
  | "MODELLING_PROFILE"
  | "GENERIC_CONTEXT"
  | "CAPABILITY_SEARCH"
  | "PRECONDITION_GRAPH"
  | "DESCRIBE_SCHEMA"
  | "AI_CONTEXT"
  | "CAPABILITY_DOCS"
  | "DOCS_API"
  | "DESCRIBE_REPORT"
  | "CAPABILITY_MANIFEST";

export const SEMANTIC_DEPENDENCY_MATRIX: Readonly<
  Record<SemanticDependencySurface, readonly SemanticRevisionDimension[]>
> = Object.freeze({
  AUTHORING_SPECIALIST: ["routing", "graph"],
  MODELLING_PROFILE: ["routing", "graph"],
  GENERIC_CONTEXT: ["routing"],
  CAPABILITY_SEARCH: ["routing", "graph"],
  PRECONDITION_GRAPH: ["graph"],
  DESCRIBE_SCHEMA: ["schema_projection"],
  AI_CONTEXT: ["routing", "graph"],
  CAPABILITY_DOCS: ["schema_projection"],
  DOCS_API: ["schema_projection"],
  DESCRIBE_REPORT: ["schema_projection"],
  CAPABILITY_MANIFEST: ["routing", "graph", "schema_projection"],
});

export function semanticDependenciesForSurface(
  surface: SemanticDependencySurface
): SemanticRevisionDimension[] {
  return [...SEMANTIC_DEPENDENCY_MATRIX[surface]];
}

export function semanticSurfacesAffectedByDimensions(
  dimensions: readonly SemanticRevisionDimension[]
): SemanticDependencySurface[] {
  const changed = new Set(dimensions);
  return (Object.keys(SEMANTIC_DEPENDENCY_MATRIX) as SemanticDependencySurface[])
    .filter((surface) =>
      SEMANTIC_DEPENDENCY_MATRIX[surface].some((dimension) =>
        changed.has(dimension)
      )
    )
    .sort((a, b) => a.localeCompare(b));
}
