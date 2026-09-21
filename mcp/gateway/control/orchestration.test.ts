import { describe, expect, test } from "bun:test";
import {
  nextActionForControlDelta,
  reduceControlExecutionState,
} from "./orchestration";
import type { ControlDelta } from "./types";

function delta(
  patch: Partial<ControlDelta> = {}
): ControlDelta {
  return {
    protocol: "lazydesigner-control-v1",
    capability: "manage_cubes",
    authoring_domain: "GEOMETRY",
    source_owner: {
      source: "mcp/server/tools/cubes.ts",
      specialist: ".agents/skills/lazydesigner-modelling/SKILL.md",
      test_owner: null,
    },
    phase_before: "geometry",
    phase_after: "geometry",
    project_uuid: "project-a",
    changed: [],
    invalidates: {
      authoring_domains: ["GEOMETRY"],
      workspace_projection: true,
      acceptance_gates: true,
    },
    freshness: {
      basis: "PRECISE_EFFECT",
      stale: ["GEOMETRY_STRUCTURE"],
      fresh: ["MATERIAL_RENDER"],
      unknown: [],
    },
    revision_evidence: {},
    next_intent: "VERIFY_OR_CONTINUE_GEOMETRY",
    verification_class: "visual",
    verification_scope: {
      kind: "CUBE_TARGETS",
      cube_uuids: ["cube-a"],
      framing: { min: [0, 0, 0], max: [4, 4, 4] },
    },
    requires_status_refresh: false,
    ...patch,
  };
}

describe("Control orchestration reducer", () => {
  test("turns scoped geometry visual verification into an explicit next action", () => {
    const action = nextActionForControlDelta(delta());
    expect(action.kind).toBe("VERIFY_VISUAL");
    expect(action.recommended_capability).toBe("capture_model_views");
  });

  test("never converts unknown mutation outcome into an automatic retry", () => {
    const action = nextActionForControlDelta(
      delta({
        freshness: {
          basis: "UNKNOWN_OUTCOME",
          stale: [],
          fresh: [],
          unknown: ["GEOMETRY_STRUCTURE", "UV_MAPPING"],
        },
      })
    );
    expect(action.kind).toBe("RECOVER");
    expect(action.recommended_capability).toBeNull();
  });

  test("resets revision on project change and increments inside one project", () => {
    const first = reduceControlExecutionState(null, delta());
    const second = reduceControlExecutionState(first.state, delta());
    const third = reduceControlExecutionState(
      second.state,
      delta({ project_uuid: "project-b" })
    );
    expect(first.state.revision).toBe(1);
    expect(second.state.revision).toBe(2);
    expect(third.state.revision).toBe(1);
  });

  test("phase authority changes require reorientation", () => {
    const reduced = reduceControlExecutionState(
      null,
      delta({
        capability: "switch_authoring_phase",
        phase_before: "geometry",
        phase_after: "animation",
        changed: ["authoring_phase"],
        requires_status_refresh: true,
        verification_class: "receipt_only",
      })
    );
    expect(reduced.continuation.next_action.kind).toBe("STATUS");
    expect(reduced.continuation.context.reorient_required).toBe(true);
  });
});
