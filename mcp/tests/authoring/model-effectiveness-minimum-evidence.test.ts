import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("model creation effectiveness — minimum necessary evidence", () => {
  test("domain judgement owns evidence policy while Control owns context/state reuse", async () => {
    const [root, control, modelling, workflow] = await Promise.all([
      source("../AGENTS.md"),
      source("gateway/control/README.md"),
      Promise.all([source("../.agents/skills/lazydesigner-modelling/SKILL.md"), source("../.agents/skills/lazydesigner-modelling/references/correction.md"), source("../.agents/skills/lazydesigner-modelling/references/uv-layout.md"), source("../.agents/skills/lazydesigner-modelling/references/verification.md")]).then((parts) => parts.join("\n")),
      source("prompts/bedrock_entity_workflow.md"),
    ]);

    for (const text of [modelling, workflow]) {
      expect(text.toLowerCase()).toContain("minimum necessary evidence");
      expect(text.toLowerCase()).toContain("unverified");
    }

    expect(control).toContain("content-addressed");
    expect(control).toContain("control_delta");
    expect(root).toContain("Reuse unchanged `known_context_ids`");
    expect(root).toContain("do not add reassurance reads or progress checks");
    expect(modelling).toContain("No per-Cube inspection ceremony");
    expect(modelling).toContain("No screenshot-per-mutation loop");
    expect(workflow).toContain("Do not inspect every Cube, capture after every mutation");
  });

  test("bounds, discovery, and uncertainty remain conditional rather than mandatory", async () => {
    const [root, policy, modelling, workflow] = await Promise.all([
      source("../AGENTS.md"),
      source("gateway/control/routingPolicy.ts"),
      Promise.all([source("../.agents/skills/lazydesigner-modelling/SKILL.md"), source("../.agents/skills/lazydesigner-modelling/references/correction.md"), source("../.agents/skills/lazydesigner-modelling/references/uv-layout.md"), source("../.agents/skills/lazydesigner-modelling/references/verification.md")]).then((parts) => parts.join("\n")),
      source("prompts/bedrock_entity_workflow.md"),
    ]);

    expect(root).toContain("Use status/search/describe only for stale/unknown orientation");
    expect(policy).toContain('unknown_capability: "SEARCH_CAPABILITIES"');
    expect(policy).toContain('schema_uncertain: "DESCRIBE_CAPABILITY"');
    expect(policy).toContain('known_capability: "INVOKE_CAPABILITY"');
    expect(policy).toContain('stale_or_lost_context: "STATUS"');
    expect(modelling).toContain("reuse fresh evidence");
    expect(workflow).toContain("`UNVERIFIED` is not a retry command");
  });

  test("cleanup remains decision-layer only with no new efficiency profile", async () => {
    const profile = await source("lib/capabilities/registrationProfile.ts");
    expect(profile).toContain('export type McpRegistrationProfile = "bedrock_entity" | "extended";');
    expect(profile).not.toContain("lean_mode");
    expect(profile).not.toContain("efficiency_mode");
    expect(profile).not.toContain("minimum_evidence");
  });
});
