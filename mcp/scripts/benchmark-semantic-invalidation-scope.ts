import {
  SEMANTIC_DEPENDENCY_MATRIX,
  semanticSurfacesAffectedByDimensions,
  type SemanticDependencySurface,
} from "../gateway/development/semanticDependencyMatrix";
import type { SemanticRevisionDimension } from "../gateway/capabilities/semanticRegistry";

export type SemanticInvalidationBenchmarkRow = {
  change: string;
  dimensions: SemanticRevisionDimension[];
  broad_surfaces: number;
  scoped_surfaces: number;
  avoided_surfaces: number;
  avoided_ratio: number;
  scoped: SemanticDependencySurface[];
};

const ALL_SURFACES = Object.keys(
  SEMANTIC_DEPENDENCY_MATRIX
) as SemanticDependencySurface[];

function row(
  change: string,
  dimensions: SemanticRevisionDimension[]
): SemanticInvalidationBenchmarkRow {
  const scoped = semanticSurfacesAffectedByDimensions(dimensions);
  const broad = ALL_SURFACES.length;
  const avoided = Math.max(0, broad - scoped.length);
  return {
    change,
    dimensions,
    broad_surfaces: broad,
    scoped_surfaces: scoped.length,
    avoided_surfaces: avoided,
    avoided_ratio: broad === 0 ? 0 : avoided / broad,
    scoped,
  };
}

export function benchmarkSemanticInvalidationScope() {
  const rows = [
    row("routing-only", ["routing"]),
    row("graph-only", ["graph"]),
    row("schema-only", ["schema_projection"]),
    row("routing+graph", ["routing", "graph"]),
    row("all-dimensions", ["routing", "graph", "schema_projection"]),
  ];

  const singleDimensionRows = rows.slice(0, 3);
  const broadTotal = singleDimensionRows.reduce(
    (sum, item) => sum + item.broad_surfaces,
    0
  );
  const scopedTotal = singleDimensionRows.reduce(
    (sum, item) => sum + item.scoped_surfaces,
    0
  );

  return {
    measurement: "semantic-invalidation-scope",
    methodology:
      "Deterministic consumer-count proxy comparing legacy broad invalidation (all semantic consumers) with dependency-matrix scoped invalidation. This is not wall-clock or token telemetry.",
    surface_count: ALL_SURFACES.length,
    rows,
    single_dimension_summary: {
      broad_surface_work: broadTotal,
      scoped_surface_work: scopedTotal,
      avoided_surface_work: broadTotal - scopedTotal,
      avoided_ratio:
        broadTotal === 0 ? 0 : (broadTotal - scopedTotal) / broadTotal,
    },
  };
}

export function assertSemanticInvalidationBenchmark(): void {
  const report = benchmarkSemanticInvalidationScope();
  const byChange = new Map(report.rows.map((item) => [item.change, item]));

  const routing = byChange.get("routing-only")!;
  const graph = byChange.get("graph-only")!;
  const schema = byChange.get("schema-only")!;
  const all = byChange.get("all-dimensions")!;

  if (routing.avoided_ratio < 0.25) {
    throw new Error(
      `routing-only semantic invalidation regression: avoided ratio ${routing.avoided_ratio.toFixed(3)} < 0.25`
    );
  }
  if (graph.avoided_ratio < 0.25) {
    throw new Error(
      `graph-only semantic invalidation regression: avoided ratio ${graph.avoided_ratio.toFixed(3)} < 0.25`
    );
  }
  if (schema.avoided_ratio < 0.4) {
    throw new Error(
      `schema-only semantic invalidation regression: avoided ratio ${schema.avoided_ratio.toFixed(3)} < 0.40`
    );
  }
  if (all.scoped_surfaces !== all.broad_surfaces) {
    throw new Error(
      "all-dimensions change must conservatively invalidate every registered semantic consumer"
    );
  }
  if (report.single_dimension_summary.avoided_ratio < 0.35) {
    throw new Error(
      `aggregate scoped invalidation regression: avoided ratio ${report.single_dimension_summary.avoided_ratio.toFixed(3)} < 0.35`
    );
  }
}

if (import.meta.main) {
  const report = benchmarkSemanticInvalidationScope();
  assertSemanticInvalidationBenchmark();
  console.log(JSON.stringify(report, null, 2));
}
