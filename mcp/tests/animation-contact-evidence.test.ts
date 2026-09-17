import { expect, test } from "bun:test";
import { analyzeAnimationContactEvidence } from "@/lib/animationContactEvidence";

function requireAvailable<T extends { state: string }>(result: T): asserts result is T & { state: "available" } {
  if (result.state !== "available") throw new Error(`expected available contact evidence, got ${result.state}`);
}

test("stable grip contact passes without becoming a visual verdict", () => {
  const result = analyzeAnimationContactEvidence({
    constraints: [{
      id: "right_hand_to_rod_grip",
      mode: "pair",
      tolerance: 0.15,
      samples: [
        { time: 0, marker: [0, 1, 0], target: [0.05, 1, 0] },
        { time: 0.5, marker: [0.2, 1.1, 0], target: [0.25, 1.1, 0] },
        { time: 1, marker: [0.4, 1.2, 0], target: [0.45, 1.2, 0] },
      ],
    }],
  });
  expect(result.state).toBe("available");
  requireAvailable(result);
  expect(result.review_constraint_count).toBe(0);
  expect(result.constraints[0]?.status).toBe("pass");
  expect(result.visual_verdict).toBe("not_evaluated");
});

test("missed impact/contact is surfaced with bounded examples", () => {
  const result = analyzeAnimationContactEvidence({
    constraints: [{
      id: "pickaxe_head_to_target",
      mode: "fixed",
      tolerance: 0.2,
      samples: [
        { time: 0.3, marker: [0, 0, 0], target: [0, 0, 0] },
        { time: 0.5, marker: [0.8, 0, 0], target: [0, 0, 0] },
      ],
    }],
  });
  requireAvailable(result);
  expect(result.review_constraint_count).toBe(1);
  expect(result.constraints[0]?.violation_count).toBe(1);
  expect(result.constraints[0]?.max_distance).toBe(0.8);
});

test("planted contact reports marker drift without inventing weight-transfer quality", () => {
  const result = analyzeAnimationContactEvidence({
    constraints: [{
      id: "left_foot_plant",
      mode: "planted",
      tolerance: 0.12,
      samples: [
        { time: 0, marker: [1, 0, 1], target: [1, 0, 1] },
        { time: 0.2, marker: [1.05, 0, 1], target: [1, 0, 1] },
        { time: 0.4, marker: [1.25, 0, 1], target: [1, 0, 1] },
      ],
    }],
  });
  requireAvailable(result);
  expect(result.constraints[0]?.status).toBe("review");
  expect(result.constraints[0]?.max_marker_drift_from_first).toBe(0.25);
  expect(result.note).toContain("does not prove believable weight");
});
