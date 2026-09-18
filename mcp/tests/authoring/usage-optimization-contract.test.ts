import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("usage optimization contract", () => {
  test("repository work states the real contract before one coherent delivery", async () => {
    const brief = await source("../.agents/skills/lazydesigner-development-brief/SKILL.md");
    expect(brief).toContain("State the contract");
    expect(brief).toContain("Preflight regressions");
    expect(brief).toContain("Success Metric");
    expect(brief).toContain("Forbidden Proxy / Non-Goal");
    expect(brief).toContain("Implement one coherent delivery");
  });

  test("known coherent creation stays specialist-owned while Control avoids broad discovery", async () => {
    const [agents, modelling, control] = await Promise.all([
      source("../AGENTS.md"),
      source("../.agents/skills/lazydesigner-modelling/SKILL.md"),
      source("gateway/control/routingPolicy.ts"),
    ]);
    expect(agents).toContain("exact known Runtime capability");
    expect(modelling).toContain("one coherent `manage_cubes` batch");
    expect(control).toContain('strategy: "DIRECT_FIRST"');
    expect(control).toContain('unknown_capability: "SEARCH_CAPABILITIES"');
    expect(control).toContain("search_limit: 4");
  });

  test("local correction reuses fresh affected evidence before broader recapture", async () => {
    const modelling = await source("../.agents/skills/lazydesigner-modelling/SKILL.md");
    expect(modelling).toContain("Reuse fresh affected pre-correction evidence");
    expect(modelling).toContain("capture before mutation only when none exists");
    expect(modelling).toContain("After mutation, recapture affected view(s)");
    expect(modelling).toMatch(/expand.*cross-view regression risk/);
    expect(modelling).toMatch(/without regression elsewhere/);
  });

  test("authoring efficiency requires accepted quality plus observable runtime cost", async () => {
    const runbook = await source("../docs/05-operations/local-acceptance-runbook.md");
    const normalized = runbook.toLowerCase().replace(/\s+/g, " ");

    for (const concept of [
      "authoring efficiency",
      "cost to accepted result",
      "quality",
      "discovery",
      "readback",
      "correction",
      "static footprint",
    ]) expect(normalized).toContain(concept);
  });

  test("workspace resume persists meaningful state instead of mutation-count checkpoints", async () => {
    const [workspace, active, flow] = await Promise.all([
      source("../workspace/README.md"),
      source("../workspace/active/README.md"),
      source("../docs/01-product/flow.md"),
    ]);
    expect(workspace).toContain("## Meaningful Persistence");
    expect(workspace).toContain("Do **not** save/checkpoint after every MCP mutation or capture");
    expect(workspace).toContain("Mutation count alone is not a checkpoint trigger");
    expect(workspace).toContain("Current handoff state");
    expect(workspace).toContain("LazyDesigner Control");
    expect(active).toContain("Full workspace lifecycle and package rules live in `../README.md`");
    expect(flow.toLowerCase()).toMatch(/handoff|resume|continuity/);
  });

  test("prompt and tool surface stay evidence-gated rather than becoming an optimization profile", async () => {
    const [profile, prompts, brief] = await Promise.all([
      source("lib/registrationProfile.ts"),
      source("server/prompts.ts"),
      source("../.agents/skills/lazydesigner-development-brief/SKILL.md"),
    ]);
    expect(profile).toContain('export type McpRegistrationProfile = "bedrock_entity" | "extended";');
    expect(profile).not.toContain("lean_mode");
    expect(profile).not.toContain("usage_profile");
    expect(prompts).toContain('createPrompt("bedrock_entity_workflow"');
    expect(brief).toContain("Authoring Efficiency");
    expect(brief).toContain("Static Footprint");
    expect(brief).toContain("Success Metric");
    expect(brief).toContain("Evidence before optimization");
  });

  test("canonical authoring docs preserve minimum-evidence authoring without retired hierarchy", async () => {
    const [workflowPolicy, geometry, validation] = await Promise.all([
      source("../docs/03-authoring/workflow.md"),
      source("../docs/03-authoring/modelling/standard.md"),
      source("../docs/03-authoring/validation/visual.md"),
    ]);
    expect(workflowPolicy).not.toContain("docs/foundation/");
    expect(geometry).toMatch(/reuse fresh|minimum/i);
    expect(validation).toMatch(/evidence|unverified/i);
  });
});
