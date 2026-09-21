import { describe, expect, test } from "bun:test";
import { getCapabilityMetadata } from "@/lib/capabilityMetadata";
import { getMcpRuntimeSurface } from "@/lib/authoringPhase";

async function text(path: string): Promise<string> {
  return Bun.file(new URL(path, import.meta.url)).text();
}

describe("single-owner authoring flow", () => {
  test("shared authoring-stage policy is conditional rather than duplicate hot-path context", async () => {
    const loading = await text("../../docs/04-system/ai-context-loading.md");

    expect(loading).toContain("Normal hot path does not load this document as an additional payload");
    expect(loading).toContain("cross-stage / approval / evidence-freshness / convergence / handoff ambiguity");
    expect(loading).toContain("one primary specialist is active");

    for (const requiredBlock of [
      "GEOMETRY_CONTEXT projection\n.agents/skills/lazydesigner-modelling/SKILL.md",
      "TEXTURE_CONTEXT projection\n.agents/skills/lazydesigner-texturing/SKILL.md",
      "ANIMATION_CONTEXT projection\n.agents/skills/lazydesigner-animation/SKILL.md",
    ]) {
      expect(loading).toContain(requiredBlock);
    }
  });

  test("Control projection remains a compact envelope instead of a second semantic database", async () => {
    const projection = await text("../../docs/04-system/control/context-projection.md");

    expect(projection).toContain("Stage Context: Source-Owned Shape");
    expect(projection).toContain("does **not** duplicate the complete semantic contents");
    expect(projection).toContain("one active stage context is selected");
    expect(projection).toContain("per-Cube / per-pixel / per-keyframe plan");
  });

  test("Control computes lifecycle and stage readiness once per packet", async () => {
    const packet = await text("../gateway/control/packet.ts");
    const readiness = await text("../gateway/control/readiness.ts");
    const packetCalls = packet.match(/lifecycleForDomain\(/g) ?? [];
    const readinessDeclarations =
      readiness.match(/export function lifecycleForDomain\(/g) ?? [];

    // Policy is declared once in readiness.ts and evaluated once per packet.
    expect(readinessDeclarations.length).toBe(1);
    expect(packetCalls.length).toBe(1);
    expect(packet).not.toContain("readinessForAuthoringDomain(");
    expect(packet).toContain("stageContext?.stage_readiness ?? null");
  });

  test("semantic stages map to exactly two Runtime surfaces", () => {
    expect(getMcpRuntimeSurface("geometry")).toBe("AUTHORING");
    expect(getMcpRuntimeSurface("texturing")).toBe("AUTHORING");
    expect(getMcpRuntimeSurface("animation")).toBe("ANIMATION");
  });

  test("Runtime phase tool applies the phase before returning its Gateway receipt", async () => {
    const phaseControl = await text("../server/runtime/phaseControl.ts");

    expect(phaseControl).toContain("getMcpRuntimeSurface");
    expect(phaseControl).toContain("requestMcpPhaseSwitch(target_phase);");
    expect(phaseControl).toContain("Geometry↔Texturing stays on the shared AUTHORING surface");
    expect(phaseControl).toContain("runtime_surface: targetSurface");
    expect(phaseControl.indexOf("requestMcpPhaseSwitch(target_phase);")).toBeLessThan(
      phaseControl.indexOf("return {")
    );
  });

  test("phase metadata preserves semantic phase affinity while transport refresh remains conservative", () => {
    const effects = getCapabilityMetadata("switch_authoring_phase").effects;
    expect(effects.phaseAffinity).toBe("update_from_result");
    expect(effects.invalidateCatalog).toBe(true);
  });
});
