import { expect, test } from "bun:test";
import { analyzeReferenceCrossViewEvidence } from "@/lib/referenceCrossViewEvidence";

test("cross-view semantic dimensions remain clean when shared world constraints agree", () => {
  const result = analyzeReferenceCrossViewEvidence({
    observations: [
      { view: "front", part_id: "body", dimensions: { x: 10, y: 18 }, attachment_parent: null, required: true },
      { view: "side", part_id: "body", dimensions: { y: 18, z: 8 }, attachment_parent: null, required: true },
      { view: "top", part_id: "body", dimensions: { x: 10, z: 8 }, attachment_parent: null, required: true },
    ],
  });
  expect(result.state).toBe("available");
  if (result.state !== "available") throw new Error("expected cross-view evidence");
  expect(result.conflict_count).toBe(0);
  expect(result.readiness).toBe("consistent_with_available_constraints");
  expect(result.visual_verdict).toBe("not_evaluated");
});

test("cross-view world-dimension disagreement is explicit instead of averaged", () => {
  const result = analyzeReferenceCrossViewEvidence({
    observations: [
      { view: "front", part_id: "body", dimensions: { y: 18 } },
      { view: "side", part_id: "body", dimensions: { y: 14 } },
    ],
    relativeTolerance: 0.08,
  });
  expect(result.state).toBe("available");
  if (result.state !== "available") throw new Error("expected cross-view evidence");
  expect(result.readiness).toBe("conflicting");
  expect(result.conflict_examples[0]).toMatchObject({ kind: "dimension_conflict", part_id: "body", axis: "y" });
});

test("attachment contradictions are reported but occlusion is never treated as absence", () => {
  const result = analyzeReferenceCrossViewEvidence({
    observations: [
      { view: "front", part_id: "handle", attachment_parent: "body", required: true },
      { view: "rear", part_id: "handle", attachment_parent: "frame", required: true },
    ],
  });
  expect(result.state).toBe("available");
  if (result.state !== "available") throw new Error("expected cross-view evidence");
  expect(result.conflict_examples[0]).toMatchObject({ kind: "attachment_conflict", part_id: "handle" });
  expect(result.note).toContain("never treats occlusion as absence");
});

test("repeated claims from a single view cannot manufacture cross-view confidence", () => {
  const result = analyzeReferenceCrossViewEvidence({
    observations: [
      { view: "front", part_id: "body", dimensions: { x: 10, y: 18 }, attachment_parent: null, required: true },
      { view: " FRONT ", part_id: " body ", dimensions: { x: 10, y: 18 }, attachment_parent: null },
    ],
  });
  expect(result.state).toBe("available");
  if (result.state !== "available") throw new Error("expected cross-view evidence");
  expect(result.observation_count).toBe(2);
  expect(result.part_count).toBe(1);
  expect(result.required_parts).toEqual(["body"]);
  expect(result.comparable_dimension_count).toBe(0);
  expect(result.attachment_comparison_count).toBe(0);
  expect(result.conflict_count).toBe(0);
  expect(result.readiness).toBe("insufficient_comparable_constraints");
});

test("contradictory same-view claims remain conflicts without posing as independent corroboration", () => {
  const result = analyzeReferenceCrossViewEvidence({
    observations: [
      { view: "front", part_id: "handle", dimensions: { y: 18 }, attachment_parent: "body" },
      { view: "Front ", part_id: "handle", dimensions: { y: 14 }, attachment_parent: "frame" },
    ],
  });
  expect(result.state).toBe("available");
  if (result.state !== "available") throw new Error("expected cross-view evidence");
  expect(result.comparable_dimension_count).toBe(0);
  expect(result.attachment_comparison_count).toBe(0);
  expect(result.readiness).toBe("conflicting");
  expect(result.conflict_examples.map((issue) => issue.kind)).toEqual(["dimension_conflict", "attachment_conflict"]);
});

test("independent viewpoints count once even when one viewpoint is repeated", () => {
  const result = analyzeReferenceCrossViewEvidence({
    observations: [
      { view: "front", part_id: "body", dimensions: { x: 10, y: 18 }, attachment_parent: null },
      { view: "FRONT", part_id: "body", dimensions: { x: 10, y: 18 }, attachment_parent: null },
      { view: "side", part_id: "body", dimensions: { y: 18, z: 8 }, attachment_parent: null },
    ],
  });
  expect(result.state).toBe("available");
  if (result.state !== "available") throw new Error("expected cross-view evidence");
  expect(result.comparable_dimension_count).toBe(1);
  expect(result.attachment_comparison_count).toBe(1);
  expect(result.readiness).toBe("consistent_with_available_constraints");
});
