import { describe, expect, test } from "bun:test";
import { AuthoringEvidenceRegistry } from "@/lib/authoringRecipe/evidenceRegistry";
import {
  compactAuthoringApplyReceipt,
  compactSemanticIdentityResolution,
} from "@/lib/authoringRecipe/compactReceipt";
import type { AuthoringRecipeApplyReceipt } from "@/lib/authoringRecipe/transaction";

describe("compact authoring evidence", () => {
  test("semantic identity projection omits native UUIDs while preserving retrievable evidence", () => {
    const registry = new AuthoringEvidenceRegistry();
    const resolution = {
      recipe_id: "asset",
      selected_by: "SEMANTIC_GROUP" as const,
      count: 2,
      identities: [
        {
          instance_id: "arms:0",
          native_uuid: "private-uuid-0",
          prototype_id: "arm",
          semantic_group: "upper_arm",
          source_pattern_id: "arms",
          instance_index: 0,
        },
        {
          instance_id: "arms:1",
          native_uuid: "private-uuid-1",
          prototype_id: "arm",
          semantic_group: "upper_arm",
          source_pattern_id: "arms",
          instance_index: 1,
        },
      ],
    };
    const handle = registry.put({ kind: "SEMANTIC_IDENTITY", value: resolution });
    const compact = compactSemanticIdentityResolution(resolution, handle);

    expect(JSON.stringify(compact)).not.toContain("private-uuid");
    expect(compact.count).toBe(2);
    expect(registry.get(handle)).toEqual({
      kind: "SEMANTIC_IDENTITY",
      value: resolution,
    });
  });

  test("mutation projection keeps decision-relevant counts and stores verbose receipt behind handle", () => {
    const registry = new AuthoringEvidenceRegistry();
    const receipt: AuthoringRecipeApplyReceipt = {
      schema: 1,
      execution: "applied",
      recipe_id: "asset",
      previous_recipe_fingerprint: "sha256:before-recipe",
      next_recipe_fingerprint: "sha256:after-recipe",
      native_source_fingerprint_before: "sha256:before-native",
      native_source_fingerprint_after: "sha256:after-native",
      created_instance_ids: [],
      updated_instance_ids: Array.from({ length: 20 }, (_, index) => "panel:" + index),
      removed_instance_ids: [],
      preserved_instance_ids: Array.from({ length: 100 }, (_, index) => "keep:" + index),
      metadata_only_instance_ids: [],
      symmetry_changed_relation_ids: [],
      affected_count: 20,
      recipe_affected_count: 20,
      invalidates: {
        geometry_structure: true,
        uv_mapping: true,
        texture_appearance: true,
        animation_motion: true,
      },
    };
    const handle = registry.put({ kind: "APPLY_RECEIPT", value: receipt });
    const compact = compactAuthoringApplyReceipt(receipt, handle);

    expect(compact.updated.count).toBe(20);
    expect(compact.updated.examples).toHaveLength(8);
    expect(compact.updated.examples_truncated).toBe(true);
    expect(compact.preserved_count).toBe(100);
    expect(JSON.stringify(compact)).not.toContain("keep:99");
    expect(registry.get(handle)).toEqual({ kind: "APPLY_RECEIPT", value: receipt });
  });

  test("registry remains bounded and evicts oldest evidence", () => {
    const registry = new AuthoringEvidenceRegistry(2);
    const handles = [0, 1, 2].map((index) =>
      registry.put({
        kind: "SEMANTIC_IDENTITY",
        value: {
          recipe_id: "asset-" + index,
          selected_by: "INSTANCE_IDS",
          count: 1,
          identities: [{
            instance_id: "i:" + index,
            native_uuid: "u:" + index,
            prototype_id: "p",
            source_pattern_id: "pattern",
            instance_index: index,
          }],
        },
      })
    );
    expect(registry.size()).toBe(2);
    expect(() => registry.get(handles[0])).toThrow("AUTHORING_EVIDENCE_NOT_FOUND");
    expect(registry.get(handles[2]).kind).toBe("SEMANTIC_IDENTITY");
  });
});
