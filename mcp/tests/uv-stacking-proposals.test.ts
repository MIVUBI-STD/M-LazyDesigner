import { describe, expect, test } from "bun:test";
import { extractUvIslands } from "@/lib/uv/islands";
import { discoverUvStackProposals } from "@/lib/uv/stacking";

function islands() {
  return extractUvIslands(
    [
      { uuid: "left", name: "left_arm", from: [0,0,0], to: [4,8,4], box_uv: false, autouv: 0, mirror_uv: false, faces: [{ face: "north", uv: [0,0,4,8] }] },
      { uuid: "right", name: "right_arm", from: [0,0,0], to: [4,8,4], box_uv: false, autouv: 0, mirror_uv: true, faces: [{ face: "north", uv: [8,0,12,8] }] },
      { uuid: "logo", name: "logo", from: [0,0,0], to: [4,8,1], box_uv: false, autouv: 0, mirror_uv: false, faces: [{ face: "north", uv: [16,0,20,8] }] },
    ],
    (island) => {
      if (island.source.cube_name === "left_arm" || island.source.cube_name === "right_arm") {
        return { stack_group: "arms", mirror_policy: "ALLOW" };
      }
      if (island.source.cube_name === "logo") {
        return { unique_detail: true, mirror_policy: "FORBID" };
      }
      return undefined;
    }
  );
}

describe("UV stack proposal engine", () => {
  test("explicit stack groups become READY only when compatible", () => {
    const proposals = discoverUvStackProposals(islands());
    const arms = proposals.find((proposal) => proposal.id === "stack:arms");
    expect(arms).toMatchObject({
      kind: "EXPLICIT_STACK_GROUP",
      state: "READY",
      island_ids: ["face:left:north", "face:right:north"],
      blockers: [],
    });
  });

  test("implicit matching remains REVIEW evidence rather than automatic stacking", () => {
    const raw = extractUvIslands([
      { uuid: "a", name: "bolt_a", from: [0,0,0], to: [2,2,2], box_uv: false, autouv: 0, mirror_uv: false, faces: [{ face: "north", uv: [0,0,2,2] }] },
      { uuid: "b", name: "bolt_b", from: [0,0,0], to: [2,2,2], box_uv: false, autouv: 0, mirror_uv: false, faces: [{ face: "north", uv: [4,0,6,2] }] },
    ]);
    expect(discoverUvStackProposals(raw)).toEqual([
      expect.objectContaining({ kind: "MATCHING_FOOTPRINT_CANDIDATE", state: "REVIEW", island_ids: ["face:a:north", "face:b:north"] }),
    ]);
  });

  test("unique detail and mirror-forbidden intent block explicit stacking", () => {
    const raw = extractUvIslands(
      [
        { uuid: "a", name: "a", from: [0,0,0], to: [2,2,2], box_uv: false, autouv: 0, mirror_uv: false, faces: [{ face: "north", uv: [0,0,2,2] }] },
        { uuid: "b", name: "b", from: [0,0,0], to: [2,2,2], box_uv: false, autouv: 0, mirror_uv: false, faces: [{ face: "north", uv: [4,0,6,2] }] },
      ],
      (island) => island.source.cube_name === "a"
        ? { stack_group: "identity", unique_detail: true }
        : { stack_group: "identity", mirror_policy: "FORBID" }
    );
    const proposal = discoverUvStackProposals(raw)[0];
    expect(proposal.state).toBe("BLOCKED");
    expect(proposal.blockers).toContain("face:a:north:UNIQUE_DETAIL");
    expect(proposal.blockers).toContain("face:b:north:MIRROR_FORBIDDEN");
  });

  test("implicit candidate discovery can be disabled", () => {
    const raw = extractUvIslands([
      { uuid: "a", name: "a", from: [0,0,0], to: [2,2,2], box_uv: false, autouv: 0, mirror_uv: false, faces: [{ face: "north", uv: [0,0,2,2] }] },
      { uuid: "b", name: "b", from: [0,0,0], to: [2,2,2], box_uv: false, autouv: 0, mirror_uv: false, faces: [{ face: "north", uv: [4,0,6,2] }] },
    ]);
    expect(discoverUvStackProposals(raw, { include_implicit_candidates: false })).toEqual([]);
  });
});
