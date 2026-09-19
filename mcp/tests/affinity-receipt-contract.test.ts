import { describe, expect, test } from "bun:test";
import { createProjectOutputSchema } from "../server/tools/project";
import { phaseControlOutputSchema } from "../server/runtime/phaseControl";

describe("Gateway affinity producer receipt contracts", () => {
  test("create_project requires the project UUID consumed by Gateway affinity", () => {
    expect(
      createProjectOutputSchema.safeParse({
        project: { uuid: "project-123", name: "Asset" },
        format: { id: "bedrock" },
      }).success
    ).toBe(true);

    expect(
      createProjectOutputSchema.safeParse({
        project: { name: "Asset" },
        format: { id: "bedrock" },
      }).success
    ).toBe(false);
  });

  test("switch_authoring_phase requires the phase and surface-change receipt consumed by Gateway", () => {
    const base = {
      phase: "animation",
      runtime_surface: "ANIMATION",
      reason: "handoff",
      resume_from: "geometry checkpoint",
      readiness_summary: null,
      surface_changed: true,
      reload_required: false,
      action: "continue",
    } as const;

    expect(phaseControlOutputSchema.safeParse(base).success).toBe(true);

    const { phase: _phase, ...withoutPhase } = base;
    expect(phaseControlOutputSchema.safeParse(withoutPhase).success).toBe(false);

    const { surface_changed: _surfaceChanged, ...withoutSurfaceChange } = base;
    expect(phaseControlOutputSchema.safeParse(withoutSurfaceChange).success).toBe(false);
  });
});
