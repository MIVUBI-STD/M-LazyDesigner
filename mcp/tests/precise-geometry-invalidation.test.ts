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

  test("Group receipts return domain arrays and bounded freshness together", () => {
    for (const [fields, expectedStale, expectedDomains] of [
      [["visibility"], ["GEOMETRY_STRUCTURE"], ["GEOMETRY"]],
      [["origin"], ["GEOMETRY_STRUCTURE", "ANIMATION_MOTION"], ["GEOMETRY", "ANIMATION"]],
      [["rotation"], ["GEOMETRY_STRUCTURE", "ANIMATION_MOTION"], ["GEOMETRY", "ANIMATION"]],
    ] as const) {
      const delta = buildControlDelta({
        capability: "modify_group", phaseBefore: "geometry", phaseAfter: "geometry",
        projectUuid: "project-a", succeeded: true,
        result: { execution: "applied", changed_fields: fields },
      });
      expect(delta.freshness.stale).toEqual(expectedStale);
      expect(delta.invalidates.authoring_domains).toEqual(expectedDomains);
    }
    const subtreeTranslation = buildControlDelta({
      capability: "modify_group", phaseBefore: "geometry", phaseAfter: "geometry",
      projectUuid: "project-a", succeeded: true,
      result: { execution: "applied", offset: [1, 0, 0], elements: 2 },
    });
    expect(subtreeTranslation.freshness.stale).toContain("GEOMETRY_STRUCTURE");
    expect(subtreeTranslation.freshness.precise).toBe(false);
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

  test("remove/rename domain invalidation agrees with receipt-scoped freshness", () => {
    const scenarios = [
      {
        capability: "remove_element",
        result: {
          removed_root: { type: "group" },
          removed_counts: { elements: 0 },
          affected_animations: 0,
        },
        scopes: ["GEOMETRY_STRUCTURE"],
        domains: ["GEOMETRY"],
      },
      {
        capability: "remove_element",
        result: {
          removed_root: { type: "group" },
          removed_counts: { elements: 3 },
          affected_animations: 0,
        },
        scopes: ["GEOMETRY_STRUCTURE", "UV_MAPPING", "TEXTURE_APPEARANCE"],
        domains: ["GEOMETRY", "TEXTURING"],
      },
      {
        capability: "rename_element",
        result: {
          execution: "applied",
          changes: [{ id: "bone-a", old_name: "old", new_name: "new" }],
          affected_animations: 0,
        },
        scopes: ["GEOMETRY_STRUCTURE"],
        domains: ["GEOMETRY"],
      },
    ] as const;
    for (const entry of scenarios) {
      const delta = buildControlDelta({
        capability: entry.capability,
        phaseBefore: "geometry",
        phaseAfter: "geometry",
        projectUuid: "project-a",
        succeeded: true,
        result: entry.result,
      });
      expect(delta.freshness.stale).toEqual([...entry.scopes]);
      expect(delta.invalidates.authoring_domains).toEqual([...entry.domains]);
    }
    const unknown = buildControlDelta({
      capability: "remove_element",
      phaseBefore: "geometry", phaseAfter: "geometry",
      projectUuid: "project-a", succeeded: true,
      result: { execution: "applied" },
    });
    expect(unknown.invalidates.authoring_domains).toContain("ANIMATION");
    expect(unknown.invalidates.authoring_domains).toContain("TEXTURING");
  });

  test("single Group rename honors explicit zero affected animations", () => {
    const delta = buildControlDelta({
      capability: "rename_element",
      phaseBefore: "geometry", phaseAfter: "geometry",
      projectUuid: "project-a", succeeded: true,
      result: {
        execution: "applied",
        element: { type: "group", uuid: "g-a" },
        changes: [{ id: "g-a", old_name: "before", new_name: "after" }],
        affected_animations: 0,
      },
    });
    expect(delta.freshness.stale).toEqual(["GEOMETRY_STRUCTURE"]);
    expect(delta.invalidates.authoring_domains).toEqual(["GEOMETRY"]);
  });

  test("Group removal without element counts remains conservative", () => {
    const delta = buildControlDelta({
      capability: "remove_element",
      phaseBefore: "geometry", phaseAfter: "geometry",
      projectUuid: "project-a", succeeded: true,
      result: {
        removed_root: { type: "group", uuid: "g-a" },
        affected_animations: 0,
      },
    });
    expect(delta.freshness.precise).toBe(false);
    expect(delta.freshness.stale).toContain("UV_MAPPING");
    expect(delta.invalidates.authoring_domains).toContain("TEXTURING");
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
