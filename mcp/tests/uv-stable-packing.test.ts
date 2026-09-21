import { describe, expect, test } from "bun:test";
import { buildUvLayoutSnapshot } from "@/lib/uv/islands";
import { planUvPacking } from "@/lib/uv/packing/planner";

const snapshotFixture = () =>
  buildUvLayoutSnapshot(
    [
      {
        uuid: "body",
        name: "body",
        from: [0, 0, 0],
        to: [8, 8, 8],
        box_uv: false,
        autouv: 0,
        mirror_uv: false,
        faces: [{ face: "north", uv: [0, 0, 8, 8] }],
      },
      {
        uuid: "existing",
        name: "existing",
        from: [0, 0, 0],
        to: [4, 4, 4],
        box_uv: false,
        autouv: 0,
        mirror_uv: false,
        faces: [{ face: "north", uv: [8, 0, 12, 4] }],
      },
      {
        uuid: "new",
        name: "new",
        from: [0, 0, 0],
        to: [2, 2, 2],
        box_uv: false,
        autouv: 0,
        mirror_uv: false,
        faces: [{ face: "north", uv: [20, 20, 22, 22] }],
      },
    ],
    32,
    32,
    (island) =>
      island.source.cube_name === "body"
        ? { locked: true }
        : { padding_pixels: 0 }
  );

describe("UV stable packing modes", () => {
  test("ADD_ONLY keeps all existing islands fixed and places only declared additions", () => {
    const snapshot = snapshotFixture();
    const plan = planUvPacking(snapshot, {
      bitmap_width: 32,
      bitmap_height: 32,
      mode: "ADD_ONLY",
      island_ids: ["face:new:north"],
    });

    expect(plan.mode).toBe("ADD_ONLY");
    expect(plan.fixed_island_ids.sort()).toEqual([
      "face:body:north",
      "face:existing:north",
    ]);
    expect(
      plan.proposed.islands.find(
        (island) => island.id === "face:existing:north"
      )?.rect
    ).toEqual(
      snapshot.islands.find(
        (island) => island.id === "face:existing:north"
      )?.rect
    );
    expect(plan.moved_island_ids).toEqual(["face:new:north"]);
  });

  test("AFFECTED_ONLY repacks only explicit affected islands", () => {
    const snapshot = snapshotFixture();
    const plan = planUvPacking(snapshot, {
      bitmap_width: 32,
      bitmap_height: 32,
      mode: "AFFECTED_ONLY",
      island_ids: ["face:existing:north", "face:new:north"],
    });

    expect(plan.fixed_island_ids).toEqual(["face:body:north"]);
    expect(plan.placement_transforms).toHaveLength(2);
  });

  test("locked islands remain fixed even when explicitly requested", () => {
    const snapshot = snapshotFixture();
    const plan = planUvPacking(snapshot, {
      bitmap_width: 32,
      bitmap_height: 32,
      mode: "REPACK_SELECTED",
      island_ids: ["face:body:north", "face:new:north"],
    });

    expect(plan.fixed_island_ids).toContain("face:body:north");
    expect(
      plan.placement_transforms.some(
        (entry) => entry.island_id === "face:body:north"
      )
    ).toBe(false);
  });

  test("targeted modes reject missing or unknown island IDs", () => {
    const snapshot = snapshotFixture();
    expect(() =>
      planUvPacking(snapshot, {
        bitmap_width: 32,
        bitmap_height: 32,
        mode: "ADD_ONLY",
      })
    ).toThrow(/requires at least one explicit island ID/);

    expect(() =>
      planUvPacking(snapshot, {
        bitmap_width: 32,
        bitmap_height: 32,
        mode: "ADD_ONLY",
        island_ids: ["missing"],
      })
    ).toThrow(/was not found/);
  });

  test("proposed metrics are recomputed from planned rectangles", () => {
    const snapshot = snapshotFixture();
    const plan = planUvPacking(snapshot, {
      bitmap_width: 32,
      bitmap_height: 32,
      mode: "ADD_ONLY",
      island_ids: ["face:new:north"],
      size_overrides: {
        "face:new:north": [6, 3],
      },
    });
    expect(plan.proposed.metrics.uv_area).toBe(64 + 16 + 18);
    expect(plan.proposed.metrics.occupied_bounds).not.toEqual(
      snapshot.metrics.occupied_bounds
    );
  });
});
