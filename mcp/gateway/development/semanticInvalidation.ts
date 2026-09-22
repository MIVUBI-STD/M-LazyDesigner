import type { CapabilitySemanticDiff, SemanticRevisionDimension } from "../capabilities/semanticRegistry";
import {
  semanticSurfacesAffectedByDimensions,
  semanticVerificationChecksForSurfaces,
} from "./semanticDependencyMatrix";

export type SemanticInvalidationFamily =
  | "CAPABILITY_SEARCH"
  | "PRECONDITION_GRAPH"
  | "DESCRIBE_SCHEMA"
  | "AI_CONTEXT"
  | "CAPABILITY_DOCS";

export type SemanticInvalidationCheck =
  | "CAPABILITY_INTELLIGENCE"
  | "DECISION_EFFICIENCY"
  | "CAPABILITY_MANIFEST"
  | "DESCRIBE_PAYLOADS";

export type SemanticInvalidationPlan = {
  changed_ids: string[];
  families: SemanticInvalidationFamily[];
  checks: SemanticInvalidationCheck[];
  full_catalog_invalidation: boolean;
};

function uniqueSorted<T extends string>(values: Iterable<T>): T[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

/**
 * Converts semantic-diff dimensions into the minimum downstream invalidation.
 *
 * Added/removed identities invalidate the whole catalog because discovery and
 * schema availability changed simultaneously. Ordinary changes remain
 * dimension-scoped.
 */
export function planSemanticInvalidation(
  diffs: readonly CapabilitySemanticDiff[]
): SemanticInvalidationPlan {
  const families = new Set<SemanticInvalidationFamily>();
  const checks = new Set<SemanticInvalidationCheck>();
  let fullCatalogInvalidation = false;

  for (const diff of diffs) {
    if (diff.change !== "CHANGED") {
      fullCatalogInvalidation = true;
      for (const family of [
        "CAPABILITY_SEARCH",
        "PRECONDITION_GRAPH",
        "DESCRIBE_SCHEMA",
        "AI_CONTEXT",
        "CAPABILITY_DOCS",
      ] as const) {
        families.add(family);
      }
      for (const check of [
        "CAPABILITY_INTELLIGENCE",
        "DECISION_EFFICIENCY",
        "CAPABILITY_MANIFEST",
        "DESCRIBE_PAYLOADS",
      ] as const) {
        checks.add(check);
      }
      continue;
    }

    const dimensions = diff.dimensions.map(
      (dimension): SemanticRevisionDimension =>
        dimension === "ROUTING"
          ? "routing"
          : dimension === "GRAPH"
            ? "graph"
            : "schema_projection"
    );
    const affectedSurfaces = semanticSurfacesAffectedByDimensions(dimensions);

    for (const surface of affectedSurfaces) {
      if (
        surface === "CAPABILITY_SEARCH" ||
        surface === "PRECONDITION_GRAPH" ||
        surface === "DESCRIBE_SCHEMA" ||
        surface === "AI_CONTEXT" ||
        surface === "CAPABILITY_DOCS"
      ) {
        families.add(surface);
      }
    }

    for (const check of semanticVerificationChecksForSurfaces(affectedSurfaces)) {
      checks.add(check);
    }
  }

  return {
    changed_ids: uniqueSorted(diffs.map((diff) => diff.id)),
    families: uniqueSorted(families),
    checks: uniqueSorted(checks),
    full_catalog_invalidation: fullCatalogInvalidation,
  };
}

export function semanticInvalidationCommands(
  plan: SemanticInvalidationPlan
): string[] {
  if (plan.changed_ids.length === 0) return [];

  const commands: string[] = [];
  if (plan.checks.includes("CAPABILITY_MANIFEST")) {
    commands.push("bun run test:capability-manifest");
  }
  if (plan.checks.includes("CAPABILITY_INTELLIGENCE")) {
    commands.push("bun run eval:capability-intelligence");
  }
  if (plan.checks.includes("DECISION_EFFICIENCY")) {
    commands.push("bun run eval:decision-efficiency");
  }
  if (plan.checks.includes("DESCRIBE_PAYLOADS")) {
    commands.push("bun run measure:describe-payloads");
  }
  return commands;
}
