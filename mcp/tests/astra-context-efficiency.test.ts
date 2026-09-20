import { describe, expect, test } from "bun:test";
import {
  measureAstraContextPayloads,
  payloadMeasurement,
} from "@/scripts/measure-astra-context";

describe("Astra context efficiency measurement", () => {
  test("reports deterministic serialized payload reduction without claiming token counts", () => {
    const measurements = measureAstraContextPayloads();
    const cubes = measurements.find(
      (entry) => entry.name === "manage_cubes_continuation"
    );
    const inspect = measurements.find(
      (entry) => entry.name === "inspect_elements_detail_schema"
    );

    expect(cubes).toBeDefined();
    expect(inspect).toBeDefined();
    expect(cubes!.saved_bytes).toBeGreaterThan(0);
    expect(cubes!.reduction_percent).toBeGreaterThan(20);
    expect(inspect!.saved_bytes).toBeGreaterThan(0);
    expect(inspect!.reduction_percent).toBeGreaterThan(60);
  });

  test("measurement never fabricates savings when payload grows", () => {
    expect(payloadMeasurement("growth", { a: 1 }, { a: 1, b: 2 })).toMatchObject({
      saved_bytes: 0,
      reduction_percent: 0,
    });
  });
});
