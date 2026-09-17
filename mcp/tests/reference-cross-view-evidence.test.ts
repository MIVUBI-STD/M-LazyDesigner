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
