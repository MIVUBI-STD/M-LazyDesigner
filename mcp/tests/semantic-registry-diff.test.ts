import { describe, expect, test } from "bun:test";
import {
  CAPABILITY_SEMANTIC_REGISTRY,
  capabilitySemanticCatalogRevisions,
  diffCapabilitySemanticRegistry,
  type CapabilitySemanticRecord,
} from "../gateway/capabilities/semanticRegistry";

function cloneRecord(
  record: CapabilitySemanticRecord
): CapabilitySemanticRecord {
  return structuredClone(record);
}

describe("semantic registry dimensional fingerprints", () => {
  test("compiled records expose stable routing, graph and schema dimensions", () => {
    const record = CAPABILITY_SEMANTIC_REGISTRY[0]!;
    for (const fingerprint of [
      record.fingerprints.routing,
      record.fingerprints.graph,
      record.fingerprints.schema_projection,
      record.fingerprints.aggregate,
    ]) {
      expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(record.semanticFingerprint).toBe(record.fingerprints.aggregate);
  });

  test("catalog revisions are deterministic and dimension-specific", () => {
    const first = capabilitySemanticCatalogRevisions(
      CAPABILITY_SEMANTIC_REGISTRY
    );
    const reversed = capabilitySemanticCatalogRevisions(
      [...CAPABILITY_SEMANTIC_REGISTRY].reverse()
    );

    expect(first).toEqual(reversed);
    for (const revision of Object.values(first)) {
      expect(revision).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  test("semantic diff reports only the changed dimension", () => {
    const original = CAPABILITY_SEMANTIC_REGISTRY.find(
      (entry) => entry.capability === "manage_cubes"
    )!;
    const changed = cloneRecord(original);
    changed.fingerprints = {
      ...changed.fingerprints,
      routing: "a".repeat(64),
      aggregate: "b".repeat(64),
    };
    changed.semanticFingerprint = changed.fingerprints.aggregate;

    expect(diffCapabilitySemanticRegistry([original], [changed])).toEqual([
      {
        id: original.id,
        change: "CHANGED",
        dimensions: ["ROUTING"],
      },
    ]);
  });

  test("unchanged aggregate revision produces no semantic invalidation", () => {
    const original = CAPABILITY_SEMANTIC_REGISTRY[0]!;
    expect(
      diffCapabilitySemanticRegistry([original], [cloneRecord(original)])
    ).toEqual([]);
  });
});
