import { describe, expect, test } from "bun:test";
import { buildControlDelta } from "@/gateway/control";

describe("texture-region downstream recheck targets", () => {
  test("paint transaction carries exact texture region", () => {
    const delta = buildControlDelta({
      capability: "paint_texture_transaction",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        texture: { uuid: "texture-a", name: "atlas" },
        revision: { before: "rev-1", after: "rev-2" },
        affected_rect: [8, 16, 24, 32],
        affected_size: [16, 16],
        operation_count: 1,
        pixel_writes: 20,
        visual_evidence: null,
      },
    });
    const texture = delta.downstream_recheck.required.find(
      (entry) => entry.scope === "TEXTURE_APPEARANCE"
    );
    expect(texture?.target).toEqual({
      texture_uuid: "texture-a",
      affected_rect: [8, 16, 24, 32],
      revision: "rev-2",
    });
  });

  test("UV evidence keeps precedence for mapped texture recheck", () => {
    const delta = buildControlDelta({
      capability: "manage_uv_layout",
      branch: { field: "operation", value: "apply" },
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        receipt: {
          changed_island_ids: ["island-a"],
          changed_cube_ids: ["cube-a"],
          changed_faces: [{ cube_uuid: "cube-a", face: "north" }],
        },
      },
    });
    const texture = delta.downstream_recheck.required.find(
      (entry) => entry.scope === "TEXTURE_APPEARANCE"
    );
    expect(texture?.target).toEqual({
      cube_ids: ["cube-a"],
      island_ids: ["island-a"],
      faces: [{ cube_uuid: "cube-a", face: "north" }],
    });
  });

  test("unbounded brush mutation does not invent a region target", () => {
    const delta = buildControlDelta({
      capability: "paint_with_brush",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: { changed: true },
    });
    const texture = delta.downstream_recheck.required.find(
      (entry) => entry.scope === "TEXTURE_APPEARANCE"
    );
    expect(texture?.target).toBeUndefined();
  });
});
