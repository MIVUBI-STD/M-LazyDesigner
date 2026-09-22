import { describe, expect, test } from "bun:test";
import {
  semanticDependenciesForOwner,
  semanticRevisionForDependencies,
} from "../gateway/development/semanticDependencies";
import { SEMANTIC_DEPENDENCY_MATRIX } from "../gateway/development/semanticDependencyMatrix";

describe("semantic dependency ownership", () => {
  test("authoring specialists and profiles share routing+graph ownership", () => {
    expect(SEMANTIC_DEPENDENCY_MATRIX.AUTHORING_SPECIALIST).toEqual([
      "routing",
      "graph",
    ]);
    expect(SEMANTIC_DEPENDENCY_MATRIX.MODELLING_PROFILE).toEqual([
      "routing",
      "graph",
    ]);
  });

  test("generic context has a narrower routing-only dependency", () => {
    expect(semanticDependenciesForOwner("GENERIC_CONTEXT")).toEqual([
      "routing",
    ]);
  });

  test("revision hashing is order-insensitive and deduplicated", () => {
    expect(
      semanticRevisionForDependencies(["graph", "routing", "graph"])
    ).toBe(
      semanticRevisionForDependencies(["routing", "graph"])
    );
  });
});
