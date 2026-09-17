import { describe, expect, test } from "bun:test";
import {
  BEDROCK_AUTHORING_COORDINATE_CONTRACT,
  MCP_AUTHORING_PHASES,
  buildMcpPhaseRuntimeContract,
} from "@/lib/authoringPhase";
import { buildMcpServerInstructions } from "@/server/server";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("Codex Bedrock agent legibility contract", () => {
  test("initialize exposes units/axes and Gateway-aware phase semantics without embedding routed tools", () => {
    expect(BEDROCK_AUTHORING_COORDINATE_CONTRACT).toContain(
      "16 Blockbench units=1 Minecraft block"
    );
    for (const term of ["x=width", "y=height", "z=length", "+Y=up"]) {
      expect(BEDROCK_AUTHORING_COORDINATE_CONTRACT).toContain(term);
    }

    for (const phase of MCP_AUTHORING_PHASES) {
      const runtime = buildMcpPhaseRuntimeContract(phase);
      const instructions = buildMcpServerInstructions(phase);
      expect(runtime).toContain(BEDROCK_AUTHORING_COORDINATE_CONTRACT);
      expect(instructions).toContain(BEDROCK_AUTHORING_COORDINATE_CONTRACT);
      expect(instructions).toContain(
        "Do not search for, emulate, rename, or substitute foreign tools"
      );
      expect(instructions).toContain("HANDOFF_REQUIRED");
      expect(instructions).toContain("switch_authoring_phase");
      expect(instructions).toContain("Gateway");
      expect(instructions.length).toBeLessThan(700);
      for (const routedTool of [
        "add_group=",
        "bone_rigging=",
        "create_texture=",
        "create_animation=",
      ]) expect(instructions).not.toContain(routedTool);
    }
  });

  test("root authoring boot deterministically routes through Control then one current specialist", async () => {
    const [agents, control, modelling, texturing, animation] = await Promise.all([
      source("../AGENTS.md"),
      source("gateway/control/packet.ts"),
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("../.agents/skills/lazydesigner-texturing/SKILL.md"),
      source("../.agents/skills/lazydesigner-animation/SKILL.md"),
    ]);

    expect(agents).toContain("LazyDesigner Control");
    expect(agents).toContain("exactly one active specialist");
    expect(agents).not.toContain(".agents/skills/blockit-bedrock-entity-mcp/SKILL.md");
    for (const path of [
      ".agents/skills/lazydesigner-modelling/SKILL.md",
      ".agents/skills/lazydesigner-texturing/SKILL.md",
      ".agents/skills/lazydesigner-animation/SKILL.md",
    ]) expect(agents).toContain(path);

    expect(control).toContain('mode: ControlTaskMode');
    expect(control).toContain("buildControlStageContext");
    expect(control).toContain("contextForAuthoringDomain");
    expect(control).not.toContain("control_protocol");

    expect(modelling).toMatch(/Bedrock Geometry|modelling/i);
    expect(texturing).toMatch(/Bedrock Texture|texturing/i);
    expect(animation).toMatch(/Bedrock Entity animation|animation/i);
  });

  test("common Geometry choices remain explicit in the modelling specialist while coordinate semantics stay centrally owned", async () => {
    const [control, modelling] = await Promise.all([
      source("gateway/control/packet.ts"),
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
    ]);

    expect(control).toContain("contextForAuthoringDomain");
    expect(BEDROCK_AUTHORING_COORDINATE_CONTRACT).toContain("16 Blockbench units=1 Minecraft block");
    expect(modelling).toContain("add_group");
    expect(modelling).toContain("reparent_element");
    expect(modelling).toContain("modify_group");
    expect(modelling).toContain("bone_rigging");
    expect(modelling).toContain("manage_cubes");
  });

  test("Texturing exposes hard entry gate, UV gate, Painter intent, and blank-atlas guard", async () => {
    const texturing = await source("../.agents/skills/lazydesigner-texturing/SKILL.md");

    expect(texturing).toContain("Geometry APPROVED + UV Layout PASS");
    expect(texturing).toMatch(/Entry:.*Geometry APPROVED \+ UV Layout PASS/);
    expect(texturing).toContain("`uv_audit.production_gate`");
    expect(texturing).toMatch(/provisional.*16×16.*blank/);
    expect(texturing).toContain("not omit blank Atlas size");
    expect(texturing).toContain("128×128 default, 256×256 opt-in");
    expect(texturing).toMatch(/`gradient_tool`.*reference-supported continuous transition/);
  });

  test("persistent workspace preserves resume-critical UV gate, scale, front orientation, and Control resume route", async () => {
    const workspace = await source("../workspace/README.md");
    expect(workspace).toContain("UV Layout:");
    expect(workspace).toContain("NOT_STARTED | IN_PROGRESS | PASS | INVALIDATED | BLOCKED");
    expect(workspace).toContain("Texturing cannot enter `IN_PROGRESS` until `UV Layout: PASS`");
    expect(workspace).toContain("LazyDesigner Control");
    expect(workspace).toContain("current-worktree active specialist");
    expect(workspace).toContain(
      "Material handoff constraints (scale/front_direction/pose override when material)"
    );
    expect(workspace).toContain(
      "front_direction` means the canonical object front used by `capture_model_views`"
    );
    expect(workspace).toContain("1 block = 16 Blockbench units");
  });
});
