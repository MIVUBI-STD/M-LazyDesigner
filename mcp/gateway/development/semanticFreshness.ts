import type {
  CapabilitySemanticCatalogRevisions,
} from "../capabilities/semanticRegistry";

export type SemanticFreshnessDimension =
  | "routing"
  | "graph"
  | "schema_projection"
  | "aggregate";

export type SemanticFreshnessStatus = "FRESH" | "STALE" | "MISSING";

export type SemanticFreshnessReport = {
  status: SemanticFreshnessStatus;
  dimensions: Record<SemanticFreshnessDimension, SemanticFreshnessStatus>;
  stale_dimensions: SemanticFreshnessDimension[];
  missing_dimensions: SemanticFreshnessDimension[];
};

const DIMENSIONS: readonly SemanticFreshnessDimension[] = [
  "routing",
  "graph",
  "schema_projection",
  "aggregate",
];

/**
 * Compares the revision stamp carried by a derived artifact against the
 * canonical semantic catalog. No timestamp is involved, so the result is
 * deterministic and cache-friendly.
 */
export function evaluateSemanticFreshness(
  expected: CapabilitySemanticCatalogRevisions,
  observed: Partial<CapabilitySemanticCatalogRevisions> | null | undefined
): SemanticFreshnessReport {
  const dimensions = {} as Record<
    SemanticFreshnessDimension,
    SemanticFreshnessStatus
  >;
  const staleDimensions: SemanticFreshnessDimension[] = [];
  const missingDimensions: SemanticFreshnessDimension[] = [];

  for (const dimension of DIMENSIONS) {
    const actual = observed?.[dimension];
    if (!actual) {
      dimensions[dimension] = "MISSING";
      missingDimensions.push(dimension);
    } else if (actual === expected[dimension]) {
      dimensions[dimension] = "FRESH";
    } else {
      dimensions[dimension] = "STALE";
      staleDimensions.push(dimension);
    }
  }

  return {
    status:
      missingDimensions.length > 0
        ? "MISSING"
        : staleDimensions.length > 0
          ? "STALE"
          : "FRESH",
    dimensions,
    stale_dimensions: staleDimensions,
    missing_dimensions: missingDimensions,
  };
}

export function semanticRevisionStamp(
  revisions: CapabilitySemanticCatalogRevisions
): Readonly<{
  semantic_revision_schema: 1;
  revisions: CapabilitySemanticCatalogRevisions;
}> {
  return Object.freeze({
    semantic_revision_schema: 1 as const,
    revisions: { ...revisions },
  });
}


export type SemanticRefreshSurface =
  | "CAPABILITY_SEARCH"
  | "DESCRIBE_SCHEMA"
  | "AI_CONTEXT"
  | "SEMANTIC_MANIFEST";

export type SemanticConsumerFreshness = SemanticFreshnessReport & {
  refresh_surfaces: SemanticRefreshSurface[];
};

export function semanticRefreshSurfaces(
  report: SemanticFreshnessReport
): SemanticRefreshSurface[] {
  const refresh = new Set<SemanticRefreshSurface>();
  const affected = new Set([
    ...report.stale_dimensions,
    ...report.missing_dimensions,
  ]);

  if (affected.has("routing")) {
    refresh.add("CAPABILITY_SEARCH");
    refresh.add("AI_CONTEXT");
  }
  if (affected.has("graph")) {
    refresh.add("CAPABILITY_SEARCH");
    refresh.add("AI_CONTEXT");
  }
  if (affected.has("schema_projection")) {
    refresh.add("DESCRIBE_SCHEMA");
  }

  // Aggregate is a catalog consistency checksum. If it is the only mismatch,
  // refresh the compact semantic manifest rather than reloading every surface.
  if (
    affected.has("aggregate") &&
    !affected.has("routing") &&
    !affected.has("graph") &&
    !affected.has("schema_projection")
  ) {
    refresh.add("SEMANTIC_MANIFEST");
  }

  return [...refresh].sort((a, b) => a.localeCompare(b));
}

export function evaluateSemanticConsumerFreshness(
  expected: CapabilitySemanticCatalogRevisions,
  observed: Partial<CapabilitySemanticCatalogRevisions> | null | undefined
): SemanticConsumerFreshness {
  const report = evaluateSemanticFreshness(expected, observed);
  return {
    ...report,
    refresh_surfaces: semanticRefreshSurfaces(report),
  };
}
