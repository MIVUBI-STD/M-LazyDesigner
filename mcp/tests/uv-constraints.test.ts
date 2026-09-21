import { describe, expect, test } from "bun:test";
import { extractUvIslands } from "@/lib/uv/islands";
import {
  assignUvConstraints,
  constraintResolverFromAssignments,
} from "@/lib/uv/constraints";

const fixture = () =>
  extractUvIslands([
    {
      uuid: "body",
      name: "body",
      from: [0, 0, 0],
      to: [8, 12, 4],
      box_uv: true,
      uv_offset: [0, 0],
      autouv: 0,
      mirror_uv: false,
      faces: [],
    },
    {
      uuid: "logo",
      name: "logo",
      from: [0, 0, 0],
      to: [4, 4, 1],
      box_uv: false,
      autouv: 0,
      mirror_uv: false,
      faces: [{ face: "north", uv: [32, 0, 36, 4] }],
    },
  ]);

describe("UV Core constraint rules", () => {
  test("assigns semantic intent without modifying island geometry", () => {
    const islands = fixture();
    const assignments = assignUvConstraints(islands, [
      {
        id: "identity",
        selector: { cube_names: ["logo"] },
        constraints: {
          semantic_group: "IDENTITY",
          unique_detail: true,
          mirror_policy: "FORBID",
          priority: 3,
          rotation: { allowed: false, step: 360 },
          density: {
            policy: "CUSTOM",
            target_pixels_per_model_unit: 4,
          },
        },
      },
      {
        id: "body-density",
        selector: { cube_uuids: ["body"] },
        constraints: {
          semantic_group: "BODY",
          density: { policy: "NORMALIZE" },
        },
      },
    ]);

    expect(assignments).toHaveLength(2);
    expect(assignments[0]).toMatchObject({
      island_id: "box:body",
      matched_rule_ids: ["body-density"],
      constraints: {
        semantic_group: "BODY",
        density: { policy: "NORMALIZE" },
      },
    });
    expect(assignments[1]).toMatchObject({
      island_id: "face:logo:north",
      matched_rule_ids: ["identity"],
      constraints: {
        semantic_group: "IDENTITY",
        unique_detail: true,
        mirror_policy: "FORBID",
        priority: 3,
        rotation: { allowed: false, step: 360 },
      },
    });
    expect(islands[1].rect).toEqual({
      x: 32,
      y: 0,
      width: 4,
      height: 4,
    });
  });

  test("conflicting matched rules fail closed instead of depending on order", () => {
    const islands = fixture();
    expect(() =>
      assignUvConstraints(islands, [
        {
          id: "logo-upright",
          selector: { cube_names: ["logo"] },
          constraints: { rotation: { allowed: false } },
        },
        {
          id: "all-rotatable",
          selector: { faces: ["north"] },
          constraints: { rotation: { allowed: true } },
        },
      ])
    ).toThrow(/constraint conflict/);
  });

  test("identical repeated intent composes safely", () => {
    const islands = fixture();
    const assignments = assignUvConstraints(islands, [
      {
        id: "identity-a",
        selector: { cube_names: ["logo"] },
        constraints: { unique_detail: true },
      },
      {
        id: "identity-b",
        selector: { island_ids: ["face:logo:north"] },
        constraints: { unique_detail: true, priority: 2 },
      },
    ]);
    expect(assignments[1]).toMatchObject({
      matched_rule_ids: ["identity-a", "identity-b"],
      constraints: { unique_detail: true, priority: 2 },
    });
  });

  test("assignments can be reused as a deterministic extraction resolver", () => {
    const islands = fixture();
    const assignments = assignUvConstraints(islands, [
      {
        id: "lock-body",
        selector: { box_uv: true },
        constraints: { locked: true, lock_group: "existing" },
      },
    ]);
    const resolver = constraintResolverFromAssignments(assignments);
    const rebuilt = extractUvIslands(
      [
        {
          uuid: "body",
          name: "body",
          from: [0, 0, 0],
          to: [8, 12, 4],
          box_uv: true,
          uv_offset: [0, 0],
          autouv: 0,
          mirror_uv: false,
          faces: [],
        },
      ],
      resolver
    );
    expect(rebuilt[0].constraints).toMatchObject({
      locked: true,
      lock_group: "existing",
    });
  });
});
