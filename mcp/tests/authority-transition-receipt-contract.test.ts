import { describe, expect, test } from "bun:test";
import {
  createProjectReceipt,
  createProjectReceiptSchema,
  isCreateProjectReceipt,
  isPhaseTransitionReceipt,
  phaseTransitionReceipt,
  phaseTransitionReceiptSchema,
} from "@/lib/receipts/authorityTransition";

describe("shared authority-transition receipt contracts", () => {
  test("accepts complete project creation and phase transition receipts", () => {
    const project = createProjectReceipt({
      project: {
        uuid: "project-a",
        name: "demo",
        save_path: null,
        export_path: null,
        export_codec: null,
        saved: false,
      },
      format: { id: "bedrock" },
      resolution: { texture_width: 128, texture_height: 128 },
    });
    expect(isCreateProjectReceipt(project)).toBe(true);

    const phase = phaseTransitionReceipt({
      phase: "animation",
      runtime_surface: "ANIMATION",
      reason: "animate",
      resume_from: "geometry-ready",
      readiness_summary: null,
      surface_changed: true,
      reload_required: false,
      action: "continue through Gateway",
    });
    expect(isPhaseTransitionReceipt(phase)).toBe(true);
  });

  test("rejects partial authority receipts", () => {
    expect(
      createProjectReceiptSchema.safeParse({
        project: { uuid: "project-a" },
      }).success
    ).toBe(false);

    expect(
      phaseTransitionReceiptSchema.safeParse({
        phase: "animation",
        surface_changed: true,
      }).success
    ).toBe(false);
  });

  test("Runtime producers and Gateway effect parsing share the same owners", async () => {
    const projectSource = await Bun.file("server/tools/project.ts").text();
    const phaseSource = await Bun.file("server/runtime/phaseControl.ts").text();
    const effects = await Bun.file("gateway/capabilities/effects.ts").text();

    expect(projectSource).toContain(
      'from "@/lib/receipts/authorityTransition"'
    );
    expect(projectSource).toContain("createProjectReceipt({");
    expect(phaseSource).toContain(
      'from "@/lib/receipts/authorityTransition"'
    );
    expect(phaseSource).toContain("phaseTransitionReceipt({");
    expect(effects).toContain("createProjectReceiptSchema.safeParse");
    expect(effects).toContain("phaseTransitionReceiptSchema.safeParse");
  });
});
