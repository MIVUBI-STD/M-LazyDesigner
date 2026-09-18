import { describe, expect, test } from "bun:test";

type ActionRef = {
  action: string;
  revision: string;
  note: string;
};

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

function actionRefs(workflow: string): ActionRef[] {
  return [...workflow.matchAll(/^\s*-?\s*uses:\s+([^@\s]+)@([^\s#]+)(?:\s+#\s*(.+))?$/gm)].map(
    (match) => ({
      action: match[1],
      revision: match[2],
      note: (match[3] ?? "").trim(),
    })
  );
}

function expectImmutableActions(workflow: string, expectedActions: string[]): void {
  const refs = actionRefs(workflow);
  expect([...new Set(refs.map((entry) => entry.action))].sort()).toEqual([...expectedActions].sort());
  for (const ref of refs) {
    expect(ref.revision).toMatch(/^[0-9a-f]{40}$/);
    if (ref.note) expect(ref.note).toMatch(/^v\d+$/);
  }
  expect(workflow).not.toMatch(/^\s*-?\s*uses:\s+[^\s]+@(main|master|latest|v\d+)\s*$/gm);
}

describe("repository workflow supply chain", () => {
  test("active verification and distribution workflows pin trusted Actions to immutable revisions", async () => {
    const [repository, authoring, mcp, release, distribution] = await Promise.all([
      source("../.github/workflows/repository-verify.yml"),
      source("../.github/workflows/authoring-policy-verify.yml"),
      source("../.github/workflows/mcp-verify.yml"),
      source("../.github/workflows/release-verify.yml"),
      source("../.github/workflows/managed-distribution.yml"),
    ]);

    for (const workflow of [repository, authoring, release]) {
      expectImmutableActions(workflow, ["actions/checkout", "oven-sh/setup-bun"]);
    }
    expectImmutableActions(mcp, [
      "actions/checkout",
      "oven-sh/setup-bun",
      "actions/upload-artifact",
    ]);
    expectImmutableActions(distribution, [
      "actions/checkout",
      "oven-sh/setup-bun",
      "actions/upload-artifact",
      "actions/download-artifact",
    ]);
  });

  test("verification workflows install only the dependency surface they execute", async () => {
    const [mcpWorkflow, repositoryWorkflow, authoringWorkflow, releaseWorkflow, bunVersion] = await Promise.all([
      source("../.github/workflows/mcp-verify.yml"),
      source("../.github/workflows/repository-verify.yml"),
      source("../.github/workflows/authoring-policy-verify.yml"),
      source("../.github/workflows/release-verify.yml"),
      source("../.bun-version"),
    ]);

    expect(bunVersion.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    expect(await Bun.file("bun.lock").exists()).toBe(true);

    for (const workflow of [mcpWorkflow, repositoryWorkflow, authoringWorkflow, releaseWorkflow]) {
      expect(workflow).toContain('bun-version-file: ".bun-version"');
      expect(workflow).toContain("contents: read");
      expect(workflow).toContain("persist-credentials: false");
    }

    expect(repositoryWorkflow).toContain("timeout-minutes: 5");
    expect(authoringWorkflow).toContain("timeout-minutes: 5");
    expect(mcpWorkflow).toContain("timeout-minutes: 10");
    expect(releaseWorkflow).toContain("timeout-minutes: 10");

    expect(mcpWorkflow).toContain("bun install --frozen-lockfile");
    expect(releaseWorkflow).toContain("bun install --frozen-lockfile");
    expect(authoringWorkflow).toContain("bun install --frozen-lockfile");
    expect(authoringWorkflow).not.toContain("--production");
    expect(repositoryWorkflow).not.toContain("bun install");
  });

  test("MCP verification publishes only a read-only exact-SHA verified compatibility artifact", async () => {
    const workflow = await source("../.github/workflows/mcp-verify.yml");
    expect(workflow).toContain("bun run ./scripts/verified-build-artifact.ts write-ci");
    expect(workflow).toContain("name: blockit-mcp-verified");
    expect(workflow).toContain("mcp/dist/blockit_mcp.js");
    expect(workflow).toContain("mcp/dist/blockit-build-provenance.json");
    expect(workflow).toContain("if-no-files-found: error");
    expect(workflow).not.toMatch(/contents:\s*write/i);
    expect(workflow).not.toContain("git push");
  });

  test("developer-facing static docs route to Repository Verify rather than executable MCP verification", async () => {
    const [repositoryWorkflow, mcpWorkflow] = await Promise.all([
      source("../.github/workflows/repository-verify.yml"),
      source("../.github/workflows/mcp-verify.yml"),
    ]);

    for (const path of [
      '"docs/**"',
      '"mcp/AGENTS.md"',
      '"mcp/README.md"',
      '"mcp/about.md"',
      '"mcp/gateway/README.md"',
      '"mcp/llms.txt"',
    ]) {
      expect(repositoryWorkflow).toContain(path);
    }

    for (const path of [
      '"!mcp/AGENTS.md"',
      '"!mcp/README.md"',
      '"!mcp/about.md"',
      '"!mcp/gateway/README.md"',
      '"!mcp/llms.txt"',
    ]) {
      expect(mcpWorkflow).toContain(path);
    }

    for (const workflow of [repositoryWorkflow, mcpWorkflow]) {
      expect(workflow).not.toContain("docs/knowledge/");
      expect(workflow).not.toContain("docs/foundation/");
    }
  });

  test("repository hygiene owners are present and routed to static verification", async () => {
    const repositoryWorkflow = await source("../.github/workflows/repository-verify.yml");

    expect(repositoryWorkflow).toContain('".editorconfig"');
    expect(repositoryWorkflow).toContain('"SECURITY.md"');
    expect(await Bun.file("../.editorconfig").exists()).toBe(true);
    expect(await Bun.file("../SECURITY.md").exists()).toBe(true);
  });

  test("supply-chain policy retains least-privilege and pinned-action boundaries", async () => {
    const rules = await source("../GITHUB_RULES.md");
    expect(rules).toMatch(/least-privilege/i);
    expect(rules).toMatch(/pinned\/trusted action versions/i);
    expect(rules).toMatch(/event-derived strings as untrusted input/i);
    expect(rules).toMatch(/pull_request_target/);
  });
});
