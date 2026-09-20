import { describe, expect, test } from "bun:test";
import {
  CONTROL_STAGE_CONTEXT_HEADROOM_BYTES,
  projectControlStageContextWithHeadroom,
} from "@/gateway/control/contextHeadroom";
import type { ControlStageContext } from "@/gateway/control/contextProjection";

function fixture(overrides: Partial<ControlStageContext> = {}): ControlStageContext {
  return {
    context_type: "GEOMETRY_CONTEXT",
    context_hash: "canonical-context-hash",
    original_user_intent: "Build the approved vehicle exactly.",
    current_user_delta: "Keep wheel spacing and correct the front bumper.",
    selected_profile: "VEHICLE",
    reference_package_id_or_hash: "reference-hash",
    workspace_revision_or_hash: "workspace-hash",
    stage_readiness: "READY",
    blocking_unknowns: [],
    non_blocking_unknowns_relevant_to_stage: ["underside paint not visible"],
    requirements: {
      dimensions_blocks: { width: 4, height: 2, length: 8 },
      player_relative_scale: "VEHICLE_SCALE",
      animation_required: true,
    },
    reference_document: "GEOMETRY.md",
    reference_image_ids: ["IMG_FRONT", "IMG_SIDE", "IMG_TOP"],
    workspace: {
      asset: "vehicle",
      current_stage: "GEOMETRY",
      gates: {
        geometry: "IN_PROGRESS",
        uv_layout: "NOT_STARTED",
        texturing: "NOT_STARTED",
        animation: "NOT_STARTED",
      },
      next_step: "Correct bumper and verify front/side silhouette.",
    },
    ...overrides,
  };
}

describe("Control stage-context headroom", () => {
  test("normal context stays decision-complete within the default proxy budget", () => {
    const input = fixture();
    const projected = projectControlStageContextWithHeadroom(input);

    expect(projected.diagnostics.budget_bytes).toBe(
      CONTROL_STAGE_CONTEXT_HEADROOM_BYTES
    );
    expect(projected.diagnostics.required_over_budget).toBe(false);
    expect(projected.context.current_user_delta).toBe(input.current_user_delta);
    expect(projected.context.requirements).toEqual(input.requirements);
    expect(projected.context.blocking_unknowns).toEqual([]);
    expect(projected.context.reference_image_ids).toEqual(input.reference_image_ids);
    expect(projected.context.workspace.next_step).toBe(input.workspace.next_step);
    expect(projected.context.context_hash).toBe(input.context_hash);
  });

  test("large useful context is bounded without dropping required evidence", () => {
    const input = fixture({
      non_blocking_unknowns_relevant_to_stage: Array.from(
        { length: 32 },
        (_, index) => `non-blocking-${index}-${"x".repeat(180)}`
      ),
      reference_image_ids: Array.from(
        { length: 32 },
        (_, index) => `IMG_${index}_${"y".repeat(80)}`
      ),
      reference_document: "D".repeat(1600),
      workspace: {
        ...fixture().workspace,
        next_step: "N".repeat(1200),
      },
    });

    const projected = projectControlStageContextWithHeadroom(input, 1800);

    expect(projected.diagnostics.state).toBe("BOUNDED");
    expect(projected.diagnostics.after_bytes).toBeLessThanOrEqual(1800);
    expect(projected.diagnostics.before_bytes).toBeGreaterThan(
      projected.diagnostics.after_bytes
    );
    expect(projected.diagnostics.dropped_useful_items).toBeGreaterThan(0);

    expect(projected.context.original_user_intent).toBe(input.original_user_intent);
    expect(projected.context.current_user_delta).toBe(input.current_user_delta);
    expect(projected.context.selected_profile).toBe(input.selected_profile);
    expect(projected.context.stage_readiness).toBe(input.stage_readiness);
    expect(projected.context.requirements).toEqual(input.requirements);
    expect(projected.context.workspace.gates).toEqual(input.workspace.gates);
  });

  test("blocking evidence is preserved even when required evidence alone exceeds budget", () => {
    const blocking = [
      `critical silhouette conflict ${"z".repeat(1400)}`,
      `attachment conflict ${"q".repeat(1400)}`,
    ];
    const input = fixture({
      stage_readiness: "BLOCKED",
      blocking_unknowns: blocking,
      current_user_delta: "U".repeat(1400),
    });

    const projected = projectControlStageContextWithHeadroom(input, 900);

    expect(projected.diagnostics.state).toBe("REQUIRED_OVER_BUDGET");
    expect(projected.diagnostics.required_over_budget).toBe(true);
    expect(projected.diagnostics.after_bytes).toBeGreaterThan(900);
    expect(projected.context.headroom_state).toBe("REQUIRED_OVER_BUDGET");
    expect(projected.context.blocking_unknowns).toEqual(blocking);
    expect(projected.context.current_user_delta).toBe(input.current_user_delta);
    expect(projected.context.requirements).toEqual(input.requirements);
  });

  test("projection is deterministic and does not mutate canonical context", () => {
    const input = fixture({
      non_blocking_unknowns_relevant_to_stage: Array.from(
        { length: 12 },
        (_, index) => `unknown-${index}-${"a".repeat(100)}`
      ),
    });
    const before = JSON.stringify(input);
    const first = projectControlStageContextWithHeadroom(input, 1400);
    const second = projectControlStageContextWithHeadroom(input, 1400);

    expect(first).toEqual(second);
    expect(JSON.stringify(input)).toBe(before);
    expect(first.diagnostics.projection_hash).toBe(second.diagnostics.projection_hash);
  });
});
