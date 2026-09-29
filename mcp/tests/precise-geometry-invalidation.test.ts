import { describe, expect, test } from "bun:test";
import { buildControlDelta } from "@/gateway/control";

describe("precise geometry invalidation from receipts", () => {
  test("visibility-only group changes preserve animation", () => {
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
        changed_fields: ["visibility"],
        group: {
          uuid: "group-a",
          name: "group-a",
          origin: [0, 0, 0],
          rotation: [0, 0, 0],
          visibility: false,
          parent: "root",
        },
      },
    });

    expect(delta.freshness.stale).toEqual(["GEOMETRY_STRUCTURE"]);
    expect(delta.downstream_recheck.required.map((entry) => entry.action))
      .toEqual(["REVERIFY_GEOMETRY"]);
  });

  test("group pivot or rotation still invalidates animation motion", () => {
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

    expect(delta.freshness.stale).toEqual([
      "GEOMETRY_STRUCTURE",
      "ANIMATION_MOTION",
    ]);
  });

  test("removing an empty unanimated group preserves UV texture and animation", () => {
    const delta = buildControlDelta({
      capability: "remove_element",
      phaseBefore: "geometry",
      phaseAfter: "geometry",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        removed_root: {
          uuid: "group-a",
          name: "group-a",
          type: "group",
          parent: "root",
        },
        removed_counts: {
          groups: 1,
          elements: 0,
          total_nodes: 1,
        },
        affected_animations: 0,
      },
    });

    expect(delta.freshness.stale).toEqual(["GEOMETRY_STRUCTURE"]);
    expect(delta.downstream_recheck.preserved_domains).toEqual([
      "TEXTURING",
      "ANIMATION",
    ]);
  });

  test("removing a group with cubes keeps mapped texture invalidation", () => {
    const delta = buildControlDelta({
      capability: "remove_element",
      phaseBefore: "geometry",
      phaseAfter: "geometry",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        removed_root: {
          uuid: "group-a",
          name: "group-a",
          type: "group",
          parent: "root",
        },
        removed_counts: {
          groups: 1,
          elements: 2,
          total_nodes: 3,
        },
        affected_animations: 0,
      },
    });

    expect(delta.freshness.stale).toEqual([
      "GEOMETRY_STRUCTURE",
      "UV_MAPPING",
      "TEXTURE_APPEARANCE",
    ]);
  });

  test("batch rename with zero affected animations preserves animation", () => {
    const delta = buildControlDelta({
      capability: "rename_element",
      phaseBefore: "geometry",
      phaseAfter: "geometry",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "applied",
        changes: [
          { id: "group-a", old_name: "old", new_name: "new" },
        ],
        affected_animations: 0,
      },
    });

    expect(delta.freshness.stale).toEqual(["GEOMETRY_STRUCTURE"]);
  });
});
