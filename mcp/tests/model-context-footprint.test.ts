import { describe, expect, test } from "bun:test";
import { measureModelContextFootprint } from "@/scripts/measure-model-context-footprint";

describe("model context static-prefix footprint", () => {
  test("measures repo-owned stable components separately from dynamic tail", async () => {
    const report = await measureModelContextFootprint();

    expect(report.proof_scope).toContain("not actual Codex prompt assembly");
    expect(report.components.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        "root_agents",
        "mcp_agents",
        "gateway_instructions",
        "gateway_tools",
        "modelling_skill",
        "texturing_skill",
        "animation_skill",
      ])
    );
    expect(report.dynamic_tail_excluded).toContain("Control stage_context");
    expect(report.dynamic_tail_excluded).toContain("tool results/history");

    for (const task of Object.values(report.task_classes)) {
      expect(task.bytes).toBeGreaterThan(0);
      expect(task.stable_prefix_candidate_sha256).toMatch(/^[a-f0-9]{64}$/);
    }
  }, 20_000);

  test("combined static footprint has explicit guardrails without pretending they are token limits", async () => {
    const report = await measureModelContextFootprint();
    const system = report.task_classes.system_development;
    const geometry = report.task_classes.geometry_authoring;
    const texturing = report.task_classes.texturing_authoring;
    const animation = report.task_classes.animation_authoring;

    // Regression ceilings, not targets. Quality-sensitive instruction slimming
    // must be evidence-driven rather than performed merely to satisfy these.
    expect(system.bytes).toBeLessThan(45_000);
    expect(geometry.bytes).toBeLessThan(65_000);
    expect(texturing.bytes).toBeLessThan(62_000);
    expect(animation.bytes).toBeLessThan(63_000);

    expect(geometry.bytes).toBeGreaterThan(system.bytes);
    expect(texturing.bytes).toBeGreaterThan(system.bytes);
    expect(animation.bytes).toBeGreaterThan(system.bytes);
  }, 20_000);
});
