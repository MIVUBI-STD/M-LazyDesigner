import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

async function read(path: string): Promise<string> {
  return readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

function normalized(value: string): string {
  return value.replace(/`/g, "").replace(/\s+/g, " ").toLowerCase();
}

describe("authoring tool-call efficiency contract", () => {
  test("active specialists expose minimum necessary call paths without fixed quotas", async () => {
    const [modelling, texturing, animation, evaluation] = await Promise.all([
      read(".agents/skills/lazydesigner-modelling/SKILL.md"),
      read(".agents/skills/lazydesigner-texturing/SKILL.md"),
      read(".agents/skills/lazydesigner-animation/SKILL.md"),
      read("mcp/docs/TOOL_CALL_EFFICIENCY.md"),
    ]).then((values) => values.map(normalized));

    expect(modelling).toContain("minimum necessary evidence");
    expect(modelling).toContain("local correction / convergence");
    expect(modelling).toContain("do not inspect each newly created cube");
    expect(texturing).toContain("direct routing");
    expect(texturing).toContain("no evidence-per-micro-mutation loop");
    expect(animation).toContain("direct routing");
    expect(animation).toContain("do not call inspect_animation after every successful deterministic mutation");
    expect(evaluation).toContain("there is no universal fixed tool-call count");
  });

  test("canonical evaluation contract treats inspection as conditional evidence", async () => {
    const source = normalized(await read("mcp/docs/TOOL_CALL_EFFICIENCY.md"));

    expect(source).toContain("cost to accepted result");
    expect(source).toContain("not progress rituals");
    expect(source).toContain("known target uuid/state -> mutate directly");
    expect(source).toContain("diagnostics=true only when decision-changing review is needed");
    expect(source).toContain("inspect_animation is for unknown/stale clip state, not mandatory before every edit");
    expect(source).toContain("fewer calls are an improvement only when acceptance quality is equivalent or better");
  });

  test("efficiency contract preserves bounded discovery and convergence rules", async () => {
    const [modelling, texturing, animation, source] = await Promise.all([
      read(".agents/skills/lazydesigner-modelling/SKILL.md"),
      read(".agents/skills/lazydesigner-texturing/SKILL.md"),
      read(".agents/skills/lazydesigner-animation/SKILL.md"),
      read("mcp/docs/TOOL_CALL_EFFICIENCY.md"),
    ]).then((values) => values.map(normalized));

    expect(texturing).toContain("search_capabilities(limit=4)");
    expect(animation).toContain("known → gateway; unknown/stale → search_capabilities");
    expect(modelling).toContain("same causal correction failing twice without new evidence → blocked");
    expect(texturing).toContain("same texture-owned causal direction twice without new evidence → blocked");
    expect(source).toContain("same diagnosed cause twice");
    expect(source).toContain("blocked unless new decision-changing evidence exists");
  });
});
