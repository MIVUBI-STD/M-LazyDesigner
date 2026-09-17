import { expect, test } from "bun:test";
import { analyzeUvPhysicalEvidence } from "@/lib/uvPhysicalEvidence";

test("physical UV evidence detects stretched face mapping", () => {
  const result = analyzeUvPhysicalEvidence([
    {
      cube_uuid: "body",
      cube_name: "body",
      face: "north",
      cube_size: [16, 8, 4],
      uv: [0, 0, 16, 8],
      texture_uuid: "atlas",
    },
    {
      cube_uuid: "panel",
      cube_name: "panel",
      face: "north",
      cube_size: [16, 4, 2],
      uv: [16, 0, 24, 8],
      texture_uuid: "atlas",
    },
  ]);
  expect(result.evaluated_face_count).toBe(2);
  expect(result.non_uniform_density_face_count).toBe(1);
  expect(result.max_density_ratio).toBeGreaterThan(1);
  expect(result.visual_verdict).toBe("not_evaluated");
});

test("exact shared UV with different physical dimensions is review evidence", () => {
  const result = analyzeUvPhysicalEvidence([
    {
      cube_uuid: "a",
      cube_name: "a",
      face: "north",
      cube_size: [8, 8, 8],
      uv: [0, 0, 8, 8],
      texture_uuid: "atlas",
    },
    {
      cube_uuid: "b",
      cube_name: "b",
      face: "north",
      cube_size: [16, 8, 8],
      uv: [0, 0, 8, 8],
      texture_uuid: "atlas",
    },
  ]);
  expect(result.exact_shared_region_count).toBe(1);
  expect(result.shared_region_physical_mismatch_count).toBe(1);
});

test("degenerate physical or UV faces stay partial", () => {
  const result = analyzeUvPhysicalEvidence([
    {
      cube_uuid: "flat",
      cube_name: "flat",
      face: "up",
      cube_size: [8, 8, 0],
      uv: [0, 0, 8, 0],
      texture_uuid: "atlas",
    },
  ]);
  expect(result.state).toBe("partial");
  expect(result.invalid_face_count).toBe(1);
});
