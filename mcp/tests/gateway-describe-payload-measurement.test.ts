import { describe, expect, test } from "bun:test";
import { measureDescribePayloads } from "@/scripts/measure-describe-payloads";

describe("Gateway describe payload measurement", () => {
  test("ranks actual Runtime input schemas and measures declared branch projections", () => {
    const report = measureDescribePayloads();
    expect(report.rows.length).toBeGreaterThan(40);

    const timeline = report.rows.find(
      (row) => row.capability === "manage_animation_timeline"
    );
    expect(timeline).toBeDefined();
    expect(timeline?.projection_status).toBe("projected");
    expect(timeline?.branch_count).toBeGreaterThan(1);
    expect(timeline?.projected_min_bytes ?? Infinity).toBeLessThan(
      timeline?.full_input_schema_bytes ?? 0
    );
    expect(timeline?.best_reduction_ratio ?? 0).toBeGreaterThan(0);

    for (let index = 1; index < report.rows.length; index += 1) {
      expect(
        report.rows[index - 1].full_input_schema_bytes
      ).toBeGreaterThanOrEqual(
        report.rows[index].full_input_schema_bytes
      );
    }

    expect(
      report.large_unprojected.every(
        (row) =>
          row.projection_status === "unprojected" &&
          row.full_input_schema_bytes >= 2_000
      )
    ).toBe(true);

    // This is a serialized-byte regression guard, not a token target.
    // New >6 KB unprojected schemas must either justify the payload or gain a
    // clean canonical branch projection before they enter the normal describe path.
    expect(
      Math.max(
        0,
        ...report.large_unprojected.map(
          (row) => row.full_input_schema_bytes
        )
      )
    ).toBeLessThan(6_000);

    for (const capability of [
      "manage_cubes",
      "manage_render_profile",
    ]) {
      const row = report.rows.find(
        (candidate) => candidate.capability === capability
      );
      expect(row?.projection_status, capability).toBe("projected");
      expect(row?.best_reduction_bytes ?? 0, capability).toBeGreaterThan(0);
    }
  });
});
