import { describe, expect, test } from "bun:test";
import { buildUvLayoutSnapshot } from "@/lib/uv/islands";
import { planUvPacking } from "@/lib/uv/packing/planner";
import { planUvDensity } from "@/lib/uv/density";
import { discoverUvStackProposals } from "@/lib/uv/stacking";
import { buildUvDryRunReport } from "@/lib/uv/dryRun";
import { planLegacyBoxUvOffsets } from "@/lib/uv/legacyBridge";

describe("UV dry-run and legacy bridge", () => {
  test("dry-run summarizes planner decisions without mutating the source snapshot", () => {
    const snapshot = buildUvLayoutSnapshot(
      [
        {
          uuid: "a",
          name: "a",
          from: [0,0,0],
          to: [4,4,1],
          box_uv: false,
          autouv: 0,
          mirror_uv: false,
          faces: [{ face: "north", uv: [0,0,4,4] }],
        },
        {
          uuid: "b",
          name: "b",
          from: [0,0,0],
          to: [4,4,1],
          box_uv: false,
          autouv: 0,
          mirror_uv: false,
          faces: [{ face: "north", uv: [8,0,12,4] }],
        },
      ],
      32,
      32,
      (island) => ({
        padding_pixels: 0,
        density: {
          policy:
            island.source.cube_name === "b"
              ? "CUSTOM"
              : "PRESERVE",
          ...(island.source.cube_name === "b"
            ? { target_pixels_per_model_unit: 2 }
            : {}),
        },
      })
    );
    const original = structuredClone(snapshot);
    const density = planUvDensity(snapshot, {
      bitmap_width: 32,
      bitmap_height: 32,
      default_target_pixels_per_model_unit: 1,
    });
    const sizeOverrides = Object.fromEntries(
      density.proposals
        .filter((proposal) => proposal.changed)
        .map((proposal) => [
          proposal.island_id,
          proposal.proposed_size,
        ])
    );
    const plan = planUvPacking(snapshot, {
      bitmap_width: 32,
      bitmap_height: 32,
      mode: "REPACK_SELECTED",
      island_ids: ["face:b:north"],
      size_overrides: sizeOverrides,
    });
    const stacks = discoverUvStackProposals(snapshot.islands);
    const report = buildUvDryRunReport(plan, {
      density_plan: density,
      stack_proposals: stacks,
    });

    expect(report.execution).toBe("planned");
    expect(report.summary.moved_islands).toBe(1);
    expect(report.summary.density_changes).toBe(1);
    expect(report.apply_allowed).toBe(true);
    expect(snapshot).toEqual(original);
  });

  test("legacy Box-UV bridge retains old first-fit owner explicitly", () => {
    const result = planLegacyBoxUvOffsets({
      occupied_regions: [
        { x: 0, y: 0, width: 4, height: 4 },
      ],
      footprints: [[4,4], [2,2]],
      logical_width: 16,
      logical_height: 16,
    });

    expect(result.backend).toBe("first_fit_v1");
    expect(result.source_owner).toBe("mcp/lib/boxUvLayout.ts");
    expect(result.offsets).toHaveLength(2);
  });
});
