import { describe, expect, test } from "bun:test";
import {
  manageUvLayoutParameters,
  uvLayoutApplyRequestSchema,
  uvLayoutPlanRequestSchema,
} from "@/lib/uv/toolContract";

describe("UV management request contract", () => {
  test("plan branch accepts high-level intent without raw UV coordinates", () => {
    const parsed = uvLayoutPlanRequestSchema.parse({
      operation: "plan",
      bitmap_width: 256,
      bitmap_height: 256,
      mode: "REPACK_SELECTED",
      island_ids: ["face:logo:north"],
      default_target_pixels_per_model_unit: 2,
      constraints: [
        {
          id: "logo",
          selector: {
            island_ids: ["face:logo:north"],
          },
          constraints: {
            semantic_group: "IDENTITY",
            unique_detail: true,
            mirror_policy: "FORBID",
            padding_pixels: 2,
            rotation: {
              allowed: false,
              step: 360,
            },
            density: {
              policy: "CUSTOM",
              target_pixels_per_model_unit: 4,
            },
          },
        },
      ],
    });

    expect(parsed.operation).toBe("plan");
    expect(JSON.stringify(parsed)).not.toContain('"uv":');
    expect(JSON.stringify(parsed)).not.toContain('"uv_offset":');
  });

  test("targeted packing modes require explicit island IDs", () => {
    expect(() =>
      uvLayoutPlanRequestSchema.parse({
        operation: "plan",
        bitmap_width: 128,
        bitmap_height: 128,
        mode: "ADD_ONLY",
      })
    ).toThrow(/requires at least one explicit island ID/);
  });

  test("apply branch accepts only content-addressed plan and source handles", () => {
    const request = uvLayoutApplyRequestSchema.parse({
      operation: "apply",
      plan_id: "uvplan:" + "a".repeat(64),
      expected_source_fingerprint:
        "sha256:" + "b".repeat(64),
    });
    expect(request.operation).toBe("apply");

    expect(() =>
      uvLayoutApplyRequestSchema.parse({
        operation: "apply",
        plan_id: "latest-plan",
        expected_source_fingerprint: "stale",
      })
    ).toThrow();
  });

  test("union rejects cross-branch fields and malformed constraints", () => {
    expect(() =>
      manageUvLayoutParameters.parse({
        operation: "apply",
        plan_id: "uvplan:" + "a".repeat(64),
        expected_source_fingerprint:
          "sha256:" + "b".repeat(64),
        bitmap_width: 256,
      })
    ).toThrow();

    expect(() =>
      uvLayoutPlanRequestSchema.parse({
        operation: "plan",
        bitmap_width: 128,
        bitmap_height: 128,
        constraints: [{
          id: "bad",
          selector: {},
          constraints: {
            padding_pixels: -1,
          },
        }],
      })
    ).toThrow();
  });
});
