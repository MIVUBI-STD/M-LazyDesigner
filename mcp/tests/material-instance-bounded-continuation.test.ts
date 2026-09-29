import { describe, expect, test } from "bun:test";
import { buildControlDelta } from "@/gateway/control";
import { materialInstanceMutationReceiptSchema } from "@/lib/receipts/materialInstances";

describe("material-instance bounded continuation", () => {
  test("bulk material-instance receipt includes changed face evidence", async () => {
    const source = await Bun.file("server/tools/material-instances.ts").text();
    expect(source).toContain(
      "changes: materialInstanceContinuationChanges(plannedChanges)"
    );
  });

  test("material-instance mutation receipt accepts complete bulk evidence", () => {
    const parsed = materialInstanceMutationReceiptSchema.parse({
      operation: "bulk_set",
      cube_count: 2,
      face_count: 2,
      cubes: [
        { uuid: "cube-a", name: "A" },
        { uuid: "cube-b", name: "B" },
      ],
      changes: [
        {
          cube_uuid: "cube-a",
          cube_name: "A",
          face: "north",
          material_name: "glass",
        },
        {
          cube_uuid: "cube-b",
          cube_name: "B",
          face: "south",
          material_name: "metal",
        },
      ],
    });
    expect(parsed.face_count).toBe(2);
  });

  test("MATERIAL_RENDER recheck carries affected cube and face target", () => {
    const delta = buildControlDelta({
      capability: "manage_material_instances",
      branch: { field: "operation", value: "bulk_set" },
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        operation: "bulk_set",
        cube_count: 2,
        face_count: 2,
        cubes: [
          { uuid: "cube-a", name: "A" },
          { uuid: "cube-b", name: "B" },
        ],
        changes: [
          {
            cube_uuid: "cube-a",
            cube_name: "A",
            face: "north",
            material_name: "glass",
          },
          {
            cube_uuid: "cube-b",
            cube_name: "B",
            face: "south",
            material_name: "metal",
          },
        ],
      },
    });

    const material = delta.downstream_recheck.required.find(
      (entry) => entry.scope === "MATERIAL_RENDER"
    );
    expect(material?.target).toEqual({
      cube_ids: ["cube-a", "cube-b"],
      faces: [
        { cube_uuid: "cube-a", face: "north" },
        { cube_uuid: "cube-b", face: "south" },
      ],
    });
  });

  test("material mutations without face receipts do not fabricate a target", () => {
    const delta = buildControlDelta({
      capability: "manage_material",
      branch: { field: "operation", value: "configure" },
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "applied",
        material: { name: "body" },
      },
    });

    const material = delta.downstream_recheck.required.find(
      (entry) => entry.scope === "MATERIAL_RENDER"
    );
    expect(material?.target).toBeUndefined();
  });
});
