import { describe, expect, test } from "bun:test";
import {
  SEMANTIC_DEPENDENCY_MATRIX,
  semanticDependenciesForSurface,
  semanticSurfacesAffectedByDimensions,
} from "../gateway/development/semanticDependencyMatrix";

describe("semantic dependency matrix", () => {
  test("centralizes all semantic consumers", () => {
    expect(SEMANTIC_DEPENDENCY_MATRIX.AUTHORING_SPECIALIST).toEqual([
      "routing",
      "graph",
    ]);
    expect(SEMANTIC_DEPENDENCY_MATRIX.DESCRIBE_SCHEMA).toEqual([
      "schema_projection",
    ]);
    expect(SEMANTIC_DEPENDENCY_MATRIX.CAPABILITY_MANIFEST).toEqual([
      "routing",
      "graph",
      "schema_projection",
    ]);
  });

  test("reverse lookup scopes routing without schema-only consumers", () => {
    const surfaces = semanticSurfacesAffectedByDimensions(["routing"]);
    expect(surfaces).toContain("CAPABILITY_SEARCH");
    expect(surfaces).toContain("AI_CONTEXT");
    expect(surfaces).not.toContain("DESCRIBE_SCHEMA");
    expect(surfaces).not.toContain("DOCS_API");
  });

  test("surface lookup returns defensive copies", () => {
    const first = semanticDependenciesForSurface("AI_CONTEXT");
    first.push("schema_projection");
    expect(semanticDependenciesForSurface("AI_CONTEXT")).toEqual([
      "routing",
      "graph",
    ]);
  });
});
