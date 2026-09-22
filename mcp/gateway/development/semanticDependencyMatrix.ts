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
  | "AI_STAGE_CONTEXT"
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
  AI_STAGE_CONTEXT: ["routing", "graph"],
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


export type SemanticRefreshSurface =
  | "CAPABILITY_SEARCH"
  | "DESCRIBE_SCHEMA"
  | "AI_CONTEXT"
  | "SEMANTIC_MANIFEST";

export type SemanticVerificationCheck =
  | "CAPABILITY_INTELLIGENCE"
  | "DECISION_EFFICIENCY"
  | "CAPABILITY_MANIFEST"
  | "DESCRIBE_PAYLOADS";

export const SEMANTIC_REFRESH_SURFACE_MAP: Readonly<
  Partial<Record<SemanticDependencySurface, SemanticRefreshSurface>>
> = Object.freeze({
  CAPABILITY_SEARCH: "CAPABILITY_SEARCH",
  DESCRIBE_SCHEMA: "DESCRIBE_SCHEMA",
  AI_CONTEXT: "AI_CONTEXT",
});

export const SEMANTIC_VERIFICATION_CHECKS: Readonly<
  Partial<Record<SemanticDependencySurface, readonly SemanticVerificationCheck[]>>
> = Object.freeze({
  CAPABILITY_SEARCH: ["CAPABILITY_INTELLIGENCE", "DECISION_EFFICIENCY"],
  PRECONDITION_GRAPH: ["DECISION_EFFICIENCY", "CAPABILITY_MANIFEST"],
  AI_CONTEXT: ["DECISION_EFFICIENCY"],
  DESCRIBE_SCHEMA: ["CAPABILITY_MANIFEST", "DESCRIBE_PAYLOADS"],
  DESCRIBE_REPORT: ["DESCRIBE_PAYLOADS"],
  CAPABILITY_MANIFEST: ["CAPABILITY_MANIFEST"],
});

export function semanticRefreshSurfacesForDimensions(
  dimensions: readonly SemanticRevisionDimension[]
): SemanticRefreshSurface[] {
  const refresh = semanticSurfacesAffectedByDimensions(dimensions)
    .flatMap((surface) => {
      const mapped = SEMANTIC_REFRESH_SURFACE_MAP[surface];
      return mapped ? [mapped] : [];
    });
  return [...new Set(refresh)].sort((a, b) => a.localeCompare(b));
}

export function semanticVerificationChecksForSurfaces(
  surfaces: readonly SemanticDependencySurface[]
): SemanticVerificationCheck[] {
  const checks = surfaces.flatMap(
    (surface) => SEMANTIC_VERIFICATION_CHECKS[surface] ?? []
  );
  return [...new Set(checks)].sort((a, b) => a.localeCompare(b));
}
