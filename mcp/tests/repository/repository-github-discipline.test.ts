import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

function requireInvariant(
  body: string,
  pattern: RegExp,
  owner: string,
  invariant: string
): void {
  if (!pattern.test(body)) {
    throw new Error(`INVARIANT: ${invariant}\nOWNER: ${owner}`);
  }
}

describe("repository GitHub discipline", () => {
  test("GITHUB_RULES keeps pin, minimum-read, diagnosis, transfer, write, proof and stop boundaries", async () => {
    const rules = await source("../GITHUB_RULES.md");

    for (const heading of [
      "## 1. PIN",
      "## 2. READ MINIMUM",
      "## 3. DIAGNOSE",
      "## 4. TOOL + TRANSFER GATE",
      "## 5. WRITE ONCE",
      "## 6. VERIFY + FAILURE POLICY",
      "## 7. STOP",
    ]) expect(rules).toContain(heading);

    requireInvariant(rules, /`Local` is the working repository authority/i, "GITHUB_RULES.md", "Local remains working authority");
    requireInvariant(rules, /GitHub-first execution partition[\s\S]*Do not transfer the whole task[\s\S]*minimum residue/i, "GITHUB_RULES.md", "higher-context escalation transfers only residue");
    requireInvariant(rules, /same exact `Local` SHA[\s\S]*Do not combine different SHAs/i, "GITHUB_RULES.md", "source proof stays exact-commit");
    requireInvariant(rules, /Static source\/CI evidence[\s\S]*does not prove live Blockbench/i, "GITHUB_RULES.md", "static proof cannot upgrade live proof");
    expect(rules).toContain("docs/04-system/implementation-map.md");
    expect(rules).not.toContain("docs/knowledge/");
    expect(rules).not.toContain("docs/foundation/");
  });

  test("development routing uses canonical LazyDesigner development owners", async () => {
    const [root, packageRules, brief, mcpDevelopment, blockbenchDevelopment] = await Promise.all([
      source("../AGENTS.md"),
      source("AGENTS.md"),
      source("../.agents/skills/lazydesigner-development-brief/SKILL.md"),
      source("../.agents/skills/lazydesigner-mcp-development/SKILL.md"),
      source("../.agents/skills/lazydesigner-blockbench-development/SKILL.md"),
    ]);

    expect(root).toContain(".agents/skills/lazydesigner-development-brief/SKILL.md");
    expect(root).toContain("Asset authoring is not software **Development**");
    requireInvariant(root, /exhaust source\/static\/CI-verifiable work first[\s\S]*handoff only the minimum[\s\S]*never transfer the whole task/i, "AGENTS.md", "root routes by minimum higher-context residue");
    expect(packageRules).toMatch(/higher-context residue does not transfer the entire task|higher-context dependency does not transfer the whole MCP task/i);
    expect(brief).toContain("## Execution Partition");
    expect(brief).toContain("Cost to Accepted Result");
    expect(mcpDevelopment).toMatch(/client-visible MCP semantics/i);
    expect(blockbenchDevelopment).toMatch(/Blockbench runtime\/plugin boundary|Blockbench runtime\/plugin/i);

    for (const retired of [
      ".agents/skills/development-brief/SKILL.md",
      ".agents/skills/mcp-server-development/SKILL.md",
      ".agents/skills/blockbench-runtime-development/SKILL.md",
    ]) expect(root).not.toContain(retired);
  });

  test("generated MCP ownership is preflighted and remains generator-owned", async () => {
    const [packageRules, specialist, next, compatibility] = await Promise.all([
      source("AGENTS.md"),
      source("../.agents/skills/lazydesigner-mcp-development/SKILL.md"),
      source("../docs/05-operations/next-action.md"),
      source("../docs/04-system/compatibility-identifiers.md"),
    ]);

    expect(packageRules).toContain("## Generated Documentation / Prompts");
    expect(packageRules).toContain("docs/api.json + docs/index.html");
    expect(packageRules).toContain("prompts/manifest.json");
    expect(packageRules).toMatch(/Never hand-edit generated API\/prompt output/i);
    expect(packageRules).toMatch(/owning generator path|canonical generator/i);
    expect(specialist).toContain("Preflight generated ownership");
    expect(next).toMatch(/No hand-editing generated docs\/output/i);
    expect(compatibility).toContain("Generated Documentation Boundary");
    expect(compatibility).toContain("bun run docs:build");
    expect(compatibility).toContain("bun run docs:check");
  });

  test("operations owners use the current hierarchical paths and defer live proof explicitly", async () => {
    const [runbook, validation, next, repositoryWorkflow] = await Promise.all([
      source("../docs/05-operations/local-acceptance-runbook.md"),
      source("../docs/05-operations/current-validation.md"),
      source("../docs/05-operations/next-action.md"),
      source("../.github/workflows/repository-verify.yml"),
    ]);

    expect(runbook).toContain("Owner: `LIVE_BLOCKBENCH` formal acceptance procedure");
    expect(runbook).toContain("Geometry↔Texturing stays on the shared AUTHORING surface");
    expect(runbook).toContain("Cost to Accepted Result");
    expect(runbook).toContain("only a representative test fixture");
    expect(validation).toContain("proof interpretation only");
    expect(validation).toMatch(/not been typechecked\/executed locally/i);
    expect(next).toContain("continuation only");
    expect(next).toMatch(/LIVE_BLOCKBENCH|local\/live/i);
    expect(repositoryWorkflow).toContain('"docs/**"');

    for (const owner of [runbook, validation, next, repositoryWorkflow]) {
      expect(owner).not.toContain("docs/knowledge/");
      expect(owner).not.toContain("docs/foundation/");
    }
    expect(next).not.toContain("3D_ASSISTED");
  });

  test("verification layers stay directory-owned and non-duplicating", async () => {
    const [repository, authoring, mcp, release, packageText] = await Promise.all([
      source("../.github/workflows/repository-verify.yml"),
      source("../.github/workflows/authoring-policy-verify.yml"),
      source("../.github/workflows/mcp-verify.yml"),
      source("../.github/workflows/release-verify.yml"),
      source("package.json"),
    ]);
    const scripts = JSON.parse(packageText).scripts as Record<string, string>;

    expect(scripts["verify:repository"]).toBe("bun test tests/repository/*.test.ts");
    expect(scripts["verify:authoring"]).toBe("bun test tests/authoring/*.test.ts");
    expect(scripts["test:runtime"]).toBe("bun test tests/*.test.ts");
    expect(scripts["verify:full"]).toBe("bun run verify:repository && bun run verify:mcp");
    expect(scripts["verify:release"]).toBe("bun run verify:full");
    expect(scripts["verify:mcp"]).toContain("bun run test:runtime");
    expect(scripts["verify:mcp"]).toContain("bun run verify:authoring");
    expect(scripts["verify:mcp"]).not.toContain("bun run verify:repository");

    expect(repository).toContain("bun run verify:repository");
    expect(authoring).toContain("bun run verify:authoring");
    for (const gate of [
      "bun run docs:check",
      "bun run typecheck",
      "bun run typecheck:gateway",
      "bun run test:runtime",
      "bun run verify:authoring",
      "bun run measure:surface",
      "bun run measure:phases",
      "bun run build",
    ]) expect(mcp).toContain(gate);
    expect(release).toContain("bun run verify:release");
    expect(authoring).toContain('"workspace/active/**"');
    expect(mcp).toContain('"!mcp/tests/repository/**"');
    expect(mcp).toContain('"!mcp/tests/authoring/**"');
  });

  test("release verification stays Local-only and ancestry guarded", async () => {
    const release = await source("../.github/workflows/release-verify.yml");
    expect(release).toContain("name: Full release contract");
    expect(release).toContain('test "$HEAD_REF" = "Local"');
    expect(release).toContain('test "$REF_NAME" = "Local"');
    expect(release).toContain("fetch-depth: 0");
    expect(release).toContain("persist-credentials: false");
    expect(release).toContain("git merge-base --is-ancestor origin/main HEAD");
    expect(release).toContain("bun run verify:release");
  });
});
