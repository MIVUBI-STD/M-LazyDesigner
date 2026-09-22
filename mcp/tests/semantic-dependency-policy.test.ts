import { describe, expect, test } from "bun:test";
import {
  SEMANTIC_DEPENDENCY_POLICY,
  semanticDependenciesForOwner,
  semanticRevisionForDependencies,
} from "../gateway/development/semanticDependencies";

describe("semantic dependency ownership", () => {
  test("authoring specialists and profiles share routing+graph ownership", () => {
    expect(SEMANTIC_DEPENDENCY_POLICY.AUTHORING_SPECIALIST).toEqual([
      "routing",
      "graph",
    ]);
    expect(SEMANTIC_DEPENDENCY_POLICY.MODELLING_PROFILE).toEqual([
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
