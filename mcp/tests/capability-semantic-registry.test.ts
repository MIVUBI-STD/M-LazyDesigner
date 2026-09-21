import { describe, expect, test } from "bun:test";
import { canonicalJson } from "../lib/semantic/canonical";
import { capabilitySemanticId, schemaSemanticId } from "../lib/semantic/identity";
import { CAPABILITY_BRANCH_MANIFEST } from "../gateway/capabilities/manifest";
import {
  CAPABILITY_SEMANTIC_REGISTRY,
  semanticFingerprint,
  semanticRecordById,
} from "../gateway/capabilities/semanticRegistry";

describe("semantic intelligence core", () => {
  test("assigns stable path-independent capability and branch identities", () => {
    expect(capabilitySemanticId("manage_cubes")).toBe("cap:manage_cubes");
    expect(
      capabilitySemanticId("manage_cubes", {
        field: "operation",
        value: "update",
      })
    ).toBe("branch:manage_cubes/operation=update");
    expect(schemaSemanticId("branch:manage_cubes/operation=update", "input")).toBe(
      "schema:branch%3Amanage_cubes%2Foperation%3Dupdate/input"
    );
  });

  test("canonical JSON is stable across object insertion order", () => {
    const left = {
      graph: { produces: ["geometry_available"], requires: ["project_bound"] },
      capability: "manage_cubes",
    };
    const right = {
      capability: "manage_cubes",
      graph: { requires: ["project_bound"], produces: ["geometry_available"] },
    };
    expect(canonicalJson(left)).toBe(canonicalJson(right));
    expect(semanticFingerprint(left)).toBe(semanticFingerprint(right));
  });

  test("manifest semantic identities are unique and registry is lossless", () => {
    const ids = CAPABILITY_BRANCH_MANIFEST.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CAPABILITY_SEMANTIC_REGISTRY).toHaveLength(
      CAPABILITY_BRANCH_MANIFEST.length
    );

    for (const entry of CAPABILITY_BRANCH_MANIFEST) {
      const compiled = semanticRecordById(entry.id);
      expect(compiled?.capability).toBe(entry.capability);
      expect(compiled?.branch).toEqual(entry.branch);
      expect(compiled?.semanticFingerprint).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  test("rejects incidental values that would make semantic hashes ambiguous", () => {
    expect(() => canonicalJson({ value: undefined })).toThrow();
    expect(() => canonicalJson({ value: Number.NaN })).toThrow();
    expect(() => canonicalJson({ value: Number.POSITIVE_INFINITY })).toThrow();
  });
});
