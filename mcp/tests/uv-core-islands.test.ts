import { describe, expect, test } from "bun:test";
import {
  buildUvLayoutSnapshot,
  extractUvIslands,
} from "@/lib/uv/islands";

describe("UV Core island extraction", () => {
  test("extracts deterministic Box-UV islands without Blockbench runtime state", () => {
    const islands = extractUvIslands([
      {
        uuid: "body",
        name: "body",
        from: [0, 0, 0],
        to: [8, 12, 4],
        box_uv: true,
        uv_offset: [16, 32],
        autouv: 1,
        mirror_uv: false,
        faces: [],
      },
    ]);

    expect(islands).toHaveLength(1);
    expect(islands[0]).toMatchObject({
      id: "box:body",
      source: {
        cube_uuid: "body",
        faces: ["north", "south", "east", "west", "up", "down"],
        box_uv: true,
        autouv: 1,
      },
      rect: {
        x: 16,
        y: 32,
        width: 24,
        height: 16,
      },
      physical: {
        width: 8,
        height: 12,
        area: 2 * (8 * 12 + 8 * 4 + 12 * 4),
        density_basis: {
          u_model_units: 24,
          v_model_units: 16,
        },
      },
    });
    expect(islands[0].constraints.rotation.step).toBe(90);
    expect(islands[0].constraints.density.policy).toBe("PRESERVE");
  });

  test("extracts per-face islands in canonical face order and normalizes reversed UV", () => {
    const islands = extractUvIslands([
      {
        uuid: "panel",
        name: "panel",
        from: [0, 0, 0],
        to: [8, 4, 2],
        box_uv: false,
        autouv: 0,
        mirror_uv: false,
        faces: [
          { face: "up", uv: [10, 8, 2, 6] },
          { face: "north", uv: [4, 4, 12, 8] },
          { face: "south", uv: [0, 0, 0, 0], enabled: false },
        ],
      },
    ]);

    expect(islands.map((island) => island.id)).toEqual([
      "face:panel:north",
      "face:panel:up",
    ]);
    expect(islands[0].rect).toEqual({
      x: 4,
      y: 4,
      width: 8,
      height: 4,
    });
    expect(islands[0].physical).toEqual({
      width: 8,
      height: 4,
      area: 32,
      density_basis: {
        u_model_units: 8,
        v_model_units: 4,
      },
    });
    expect(islands[1].rect).toEqual({
      x: 2,
      y: 6,
      width: 8,
      height: 2,
    });
    expect(islands[1].physical).toEqual({
      width: 8,
      height: 2,
      area: 16,
      density_basis: {
        u_model_units: 8,
        v_model_units: 2,
      },
    });
  });

  test("constraint resolver adds intent without coupling packing policy to extraction", () => {
    const islands = extractUvIslands(
      [
        {
          uuid: "logo",
          name: "logo",
          from: [0, 0, 0],
          to: [4, 4, 1],
          box_uv: false,
          autouv: 0,
          mirror_uv: false,
          faces: [{ face: "north", uv: [0, 0, 4, 4] }],
        },
      ],
      (island) =>
        island.source.cube_name === "logo"
          ? {
              unique_detail: true,
              semantic_group: "IDENTITY",
              mirror_policy: "FORBID",
              rotation: { allowed: false, step: 360 },
              priority: 2,
            }
          : undefined
    );

    expect(islands[0].constraints).toMatchObject({
      unique_detail: true,
      semantic_group: "IDENTITY",
      mirror_policy: "FORBID",
      rotation: { allowed: false, step: 360 },
      priority: 2,
    });
  });

  test("layout snapshot exposes stable data-only metrics", () => {
    const snapshot = buildUvLayoutSnapshot(
      [
        {
          uuid: "body",
          name: "body",
          from: [0, 0, 0],
          to: [8, 8, 8],
          box_uv: true,
          uv_offset: [0, 0],
          autouv: 0,
          mirror_uv: false,
          faces: [],
        },
        {
          uuid: "panel",
          name: "panel",
          from: [0, 0, 0],
          to: [4, 2, 1],
          box_uv: false,
          autouv: 0,
          mirror_uv: false,
          faces: [{ face: "north", uv: [24, 0, 28, 2] }],
        },
      ],
      128,
      128
    );

    expect(snapshot.schema).toBe(1);
    expect(snapshot.planner_version).toBe(1);
    expect(snapshot.metrics).toMatchObject({
      island_count: 2,
      face_count: 7,
      physical_area: 392,
      uv_area: 520,
      occupied_bounds: {
        x: 0,
        y: 0,
        width: 32,
        height: 16,
      },
    });
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  test("invalid low-level UV input fails closed before planning", () => {
    expect(() =>
      extractUvIslands([
        {
          uuid: "bad",
          name: "bad",
          from: [0, 0, 0],
          to: [4, 4, 4],
          box_uv: true,
          autouv: 0,
          mirror_uv: false,
          faces: [],
        },
      ])
    ).toThrow(/uv_offset/);

    expect(() =>
      extractUvIslands([
        {
          uuid: "bad-face",
          name: "bad-face",
          from: [0, 0, 0],
          to: [4, 4, 4],
          box_uv: false,
          autouv: 0,
          mirror_uv: false,
          faces: [{ face: "north", uv: [0, 0, Number.NaN, 4] }],
        },
      ])
    ).toThrow(/finite coordinates/);
  });
});
