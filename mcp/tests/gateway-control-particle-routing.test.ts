import { describe, expect, test } from "bun:test";
import {
  authoringDomainForCapability,
  buildControlDelta,
  sourceOwnerForCapability,
} from "@/gateway/control";
import { classifyMcpToolPhaseByName } from "@/lib/authoringPhase";

describe("LazyDesigner Control particle routing", () => {
  test("particle capabilities remain Animation-owned support without a fourth phase", () => {
    expect(classifyMcpToolPhaseByName("inspect_particle")).toBe("animation");
    expect(classifyMcpToolPhaseByName("manage_particle")).toBe("animation");
    expect(authoringDomainForCapability("inspect_particle")).toBe("ANIMATION");
    expect(authoringDomainForCapability("manage_particle")).toBe("ANIMATION");
  });

  test("particle source ownership resolves directly to the focused particle implementation", () => {
    for (const capability of ["inspect_particle", "manage_particle"]) {
      expect(sourceOwnerForCapability(capability)).toEqual({
        source: "mcp/server/tools/particle/manage.ts",
        specialist: ".agents/skills/lazydesigner-animation/SKILL.md",
        anchor_test: "mcp/tests/particle-tool-contract.test.ts",
      });
    }
  });

  test("successful particle mutation invalidates only Animation authoring evidence", () => {
    const delta = buildControlDelta({
      capability: "manage_particle",
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
    });

    expect(delta.authoring_domain).toBe("ANIMATION");
    expect(delta.invalidates.authoring_domains).toEqual(["ANIMATION"]);
    expect(delta.invalidates.workspace_projection).toBe(true);
    expect(delta.invalidates.acceptance_gates).toBe(true);
    expect(delta.next_intent).toBe("VERIFY_OR_CONTINUE_ANIMATION");
    expect(delta.requires_status_refresh).toBe(false);
  });

  test("particle inspection stays read-only for Control continuation", () => {
    const delta = buildControlDelta({
      capability: "inspect_particle",
      phaseBefore: "animation",
      phaseAfter: "animation",
      projectUuid: "project-a",
      succeeded: true,
    });

    expect(delta.authoring_domain).toBe("ANIMATION");
    expect(delta.invalidates.authoring_domains).toEqual([]);
    expect(delta.invalidates.workspace_projection).toBe(false);
    expect(delta.invalidates.acceptance_gates).toBe(false);
  });
});
