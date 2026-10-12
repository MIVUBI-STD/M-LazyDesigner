import { describe, expect, test } from "bun:test";
import { selectLowestCostCorrection } from "@/lib/reference/correctionSolver";

const candidates = [
  { id: "resize", predicted_error: 0.2, mutation_cost: 0.1, risk: 0.3, patch: "resize" },
  { id: "translate", predicted_error: 0.4, mutation_cost: 0.1, risk: 0.2, patch: "translate" },
];

describe("correction candidate ranking safety", () => {
  test("ranks supported candidate estimates deterministically without claiming visual improvement", () => {
    const decision = selectLowestCostCorrection(candidates);
    expect(decision.selected.id).toBe("resize");
    expect(decision.rejected_ids).toEqual(["translate"]);
    expect(Number.isFinite(decision.score)).toBe(true);
  });

  test("duplicate or malformed candidates cannot silently bias the selected correction", () => {
    expect(() => selectLowestCostCorrection([candidates[0]!, candidates[0]!])).toThrow("unique");
    expect(() => selectLowestCostCorrection([{ ...candidates[0]!, id: " resize " }])).toThrow("unique");
    expect(() => selectLowestCostCorrection([{ ...candidates[0]!, predicted_error: Number.NaN }])).toThrow("finite");
  });

  test("overflow and meaningless weights never produce an apparently valid correction score", () => {
    expect(() => selectLowestCostCorrection([{ ...candidates[0]!, predicted_error: Number.MAX_VALUE }], {
      error_weight: Number.MAX_VALUE,
    })).toThrow("overflowed");
    expect(() => selectLowestCostCorrection(candidates, {
      error_weight: 0, mutation_weight: 0, risk_weight: 0,
    })).toThrow("nonzero weight");
  });

  test("risk ceiling still excludes otherwise lower-error destructive candidates", () => {
    expect(selectLowestCostCorrection(candidates, { maximum_risk: 0.2 }).selected.id).toBe("translate");
  });
});
