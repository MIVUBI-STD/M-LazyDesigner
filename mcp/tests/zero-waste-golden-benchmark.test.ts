import { describe, expect, test } from "bun:test";
import { runZeroWasteGoldenBenchmark } from "@/scripts/benchmark-zero-waste-golden";

describe("Zero-Waste Golden projection benchmark", () => {
  test("all golden tasks reduce AI-client payload while preserving decision-critical semantics", () => {
    const tasks = runZeroWasteGoldenBenchmark();

    expect(tasks.map((task) => task.task)).toEqual([
      "known_geometry_transform",
      "hierarchy_receipt",
      "material_receipt",
      "animation_effects_receipt",
      "unknown_target_discovery",
      "failed_mutation_recovery",
    ]);

    for (const task of tasks) {
      expect(task.quality_preserved, task.task).toBe(true);
      expect(
        Object.values(task.semantic_checks).every(Boolean),
        task.task
      ).toBe(true);
      expect(task.after_bytes, task.task).toBeLessThan(task.before_bytes);
      expect(task.saved_bytes, task.task).toBeGreaterThan(0);
      expect(task.reduction_percent, task.task).toBeGreaterThan(0);
    }
  });

  test("aggregate projection saving is material without becoming a quality proxy", () => {
    const tasks = runZeroWasteGoldenBenchmark();
    const before = tasks.reduce((sum, task) => sum + task.before_bytes, 0);
    const after = tasks.reduce((sum, task) => sum + task.after_bytes, 0);
    const reduction = ((before - after) / before) * 100;

    expect(before).toBeGreaterThan(after);
    expect(reduction).toBeGreaterThan(10);

    // Quality remains independently asserted per semantic invariant above.
    expect(tasks.every((task) => task.quality_preserved)).toBe(true);
  });
});
