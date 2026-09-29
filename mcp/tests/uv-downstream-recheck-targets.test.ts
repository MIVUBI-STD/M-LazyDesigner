import { describe, expect, test } from "bun:test";
import { buildControlDelta } from "@/gateway/control";

describe("UV downstream recheck targets", () => {
  test("UV apply carries affected cube face and island evidence into recheck targets", () => {
    const delta = buildControlDelta({
      capability: "manage_uv_layout",
      branch: { field: "operation", value: "apply" },
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        receipt: {
          changed_island_ids: ["face:cube-a:north", "face:cube-b:south"],
          changed_cube_ids: ["cube-a", "cube-b"],
          changed_faces: [
            { cube_uuid: "cube-a", face: "north" },
            { cube_uuid: "cube-b", face: "south" },
          ],
        },
      },
    });

    const uv = delta.downstream_recheck.required.find(
      (entry) => entry.scope === "UV_MAPPING"
    );
    const texture = delta.downstream_recheck.required.find(
      (entry) => entry.scope === "TEXTURE_APPEARANCE"
    );

    expect(uv?.target).toEqual({
      cube_ids: ["cube-a", "cube-b"],
      island_ids: ["face:cube-a:north", "face:cube-b:south"],
      faces: [
        { cube_uuid: "cube-a", face: "north" },
        { cube_uuid: "cube-b", face: "south" },
      ],
    });
    expect(texture?.target).toEqual(uv?.target);
  });

  test("UV target extraction deduplicates receipt identities", () => {
    const delta = buildControlDelta({
      capability: "manage_uv_layout",
      branch: { field: "operation", value: "apply" },
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        receipt: {
          changed_island_ids: ["i-a", "i-a"],
          changed_cube_ids: ["cube-a", "cube-a"],
          changed_faces: [
            { cube_uuid: "cube-a", face: null },
          ],
        },
      },
    });

    const uv = delta.downstream_recheck.required.find(
      (entry) => entry.scope === "UV_MAPPING"
    );

    expect(uv?.target).toMatchObject({
      cube_ids: ["cube-a"],
      island_ids: ["i-a"],
      faces: [{ cube_uuid: "cube-a", face: null }],
    });
  });

  test("non-UV geometry rechecks do not fabricate target evidence", () => {
    const delta = buildControlDelta({
      capability: "modify_group",
      phaseBefore: "geometry",
      phaseAfter: "geometry",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "applied",
        id: "group-a",
        name: "group-a",
        changed_fields: ["origin"],
        group: {
          uuid: "group-a",
          name: "group-a",
          origin: [1, 0, 0],
          rotation: [0, 0, 0],
          visibility: true,
          parent: "root",
        },
      },
    });

    expect(
      delta.downstream_recheck.required.every(
        (entry) => entry.target === undefined
      )
    ).toBe(true);
  });
});
