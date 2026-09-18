import { describe, expect, test } from "bun:test";
import { buildControlDelta } from "@/gateway/control";

describe("LazyDesigner Control continuation hardening", () => {
  test("successful phase handoff records the real transition and requests one refresh", () => {
    const delta = buildControlDelta({
      capability: "switch_authoring_phase",
      phaseBefore: "texturing",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
    });
    expect(delta.phase_before).toBe("texturing");
    expect(delta.phase_after).toBe("animation");
    expect(delta.changed).toEqual(["authoring_phase"]);
    expect(delta.requires_status_refresh).toBe(true);
    expect(delta.next_intent).toBe("CONTINUE_NEW_AUTHORING_PHASE");
  });

  test("failed phase handoff is state-neutral and does not invent a refresh", () => {
    const delta = buildControlDelta({
      capability: "switch_authoring_phase",
      phaseBefore: "texturing",
      phaseAfter: "texturing",
      projectUuid: "project-a",
      succeeded: false,
    });
    expect(delta.changed).toEqual([]);
    expect(delta.requires_status_refresh).toBe(false);
    expect(delta.next_intent).toBe("RECOVER_CURRENT_OPERATION");
  });

  test("actual visual mutations keep visual verification even with complete structural receipts", () => {
    const delta = buildControlDelta({
      capability: "manage_cubes",
      phaseBefore: "geometry",
      phaseAfter: "geometry",
      projectUuid: "project-a",
      succeeded: true,
      result: {
        execution: "applied",
        visual_verdict: "not_evaluated",
        modified: 1,
        before: { uuid: "cube-a" },
        after: { uuid: "cube-a" },
        geometry_effect: { changed_fields: ["rotation"] },
      },
    });
    expect(delta.verification_class).toBe("visual");
  });

  test("ordinary successful mutation continues without status reread", () => {
    const delta = buildControlDelta({
      capability: "manage_cubes",
      phaseBefore: null,
      phaseAfter: null,
      projectUuid: null,
      succeeded: true,
    });
    expect(delta.changed).toEqual([]);
    expect(delta.requires_status_refresh).toBe(false);
    expect(delta.next_intent).toBe("VERIFY_OR_CONTINUE_GEOMETRY");
  });

  test("gateway captures phase-before only when the canonical receipt owner requires it", async () => {
    const source = await Bun.file("gateway/index.ts").text();
    expect(source).toContain("capabilityNeedsPhaseSnapshot(capability)");
    expect(source).toContain("deriveControlReceipt");
    expect(source).toContain("phaseBefore,");
    expect(source).toContain("phaseAfter,");
    expect(source).toContain("buildControlDelta");
  });
});
