import { describe, expect, test } from "bun:test";
import {
  workspaceSemanticFingerprint,
  workspaceSemanticState,
} from "./workspace";

describe("workspace semantic fingerprint", () => {
  const base = [
    "# Chair",
    "Current Stage: Texturing",
    "Geometry: APPROVED",
    "UV Layout: PASS",
    "Texturing: IN_PROGRESS",
    "Animation: NOT_STARTED",
    "Current next step: paint seat",
    "Known blocker(s): none",
  ].join("\n");

  test("ignores unrelated prose and formatting outside lifecycle fields", () => {
    const changedProse = [
      "# Chair",
      "",
      "This paragraph is documentation only and may change freely.",
      "",
      "Current Stage: Texturing",
      "Geometry: APPROVED",
      "UV Layout: PASS",
      "Texturing: IN_PROGRESS",
      "Animation: NOT_STARTED",
      "Current next step: paint seat",
      "Known blocker(s): none",
      "",
      "More notes.",
    ].join("\n");

    expect(workspaceSemanticFingerprint(base)).toBe(
      workspaceSemanticFingerprint(changedProse)
    );
  });

  test("changes when a lifecycle field changes", () => {
    const changed = base.replace(
      "Texturing: IN_PROGRESS",
      "Texturing: APPROVED"
    );
    expect(workspaceSemanticFingerprint(base)).not.toBe(
      workspaceSemanticFingerprint(changed)
    );
  });

  test("semantic state owns exactly the Control lifecycle fields", () => {
    expect(workspaceSemanticState(base)).toEqual({
      asset: "Chair",
      current_stage: "Texturing",
      gates: {
        geometry: "APPROVED",
        uv_layout: "PASS",
        texturing: "IN_PROGRESS",
        animation: "NOT_STARTED",
      },
      next_step: "paint seat",
      blockers: [],
    });
  });
});
