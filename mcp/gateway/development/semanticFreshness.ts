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
