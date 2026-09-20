import { describe, expect, test } from "bun:test";

async function text(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("MCP dependency closure", () => {
  test("verification layers compose without rerunning repository/authoring subsets in the full gate", async () => {
    const packageJson = JSON.parse(await text("package.json")) as { scripts: Record<string, string> };

    expect(packageJson.scripts["test:runtime"]).toBe("bun test tests/*.test.ts");
    expect(packageJson.scripts["verify:closure"]).toBe("bun run verify:repository && bun run verify:authoring && bun run docs:check");
    expect(packageJson.scripts["verify:closure"]).not.toContain("verify:mcp");
    expect(packageJson.scripts["verify:mcp"]).toContain("bun run test:runtime");
    expect(packageJson.scripts["verify:mcp"]).toContain("bun run verify:authoring");
    expect(packageJson.scripts["verify:mcp"]).toContain("bun run benchmark:zero-waste-total");
    expect(packageJson.scripts["verify:mcp"]).not.toContain("bun run benchmark:zero-waste-workflow");
    expect(packageJson.scripts["verify:full"]).toBe("bun run verify:repository && bun run verify:mcp");
    expect(packageJson.scripts["verify:release"]).toBe("bun run verify:full");
    expect(packageJson.scripts["verify:mcp"]).toContain("bun run docs:check");
  });

  test("generated docs and runtime prompt manifest share the same freshness gate", async () => {
    const freshness = await text("build/check-docs-freshness.ts");
    expect(freshness).toContain('{ file: "api.json"');
    expect(freshness).toContain('{ file: "index.html"');
    expect(freshness).toContain('file: "../prompts/manifest.json"');
    expect(freshness).toContain('runBuildScript("docs:build")');
    expect(freshness).toContain('runBuildScript("prompts:build")');
  });

  test("documentation hierarchy keeps semantic owners separated", async () => {
    const [docs, flow, reference, authoring, system, operations] = await Promise.all([
      text("../docs/README.md"),
      text("../docs/01-product/flow.md"),
      text("../docs/02-reference/README.md"),
      text("../docs/03-authoring/README.md"),
      text("../docs/04-system/README.md"),
      text("../docs/05-operations/README.md"),
    ]);

    for (const domain of ["01-product", "02-reference", "03-authoring", "04-system", "05-operations"]) {
      expect(docs).toContain(domain);
    }
    expect(flow).toMatch(/end-to-end|workflow/i);
    expect(reference).toMatch(/reference/i);
    expect(authoring).toMatch(/authoring/i);
    expect(system).toMatch(/system|control/i);
    expect(operations).toMatch(/operations|continuation|proof/i);
  });

  test("authoring stage mirrors are owned by authoring docs and local runbook", async () => {
    const [workflow, runbook, phaseContract] = await Promise.all([
      text("../docs/03-authoring/workflow.md"),
      text("../docs/05-operations/local-acceptance-runbook.md"),
      text("lib/authoringPhase.ts"),
    ]);

    expect(workflow).toMatch(/USER APPROVAL or authorized autonomous verification/i);
    expect(workflow).toContain("UV Layout PASS");
    expect(workflow).toMatch(/Animation begins only after canonical readiness/i);
    expect(runbook).toContain("Geometry↔Texturing stays on the shared AUTHORING surface");
    expect(runbook).toMatch(/UV readiness preflight[\s\S]*user Geometry APPROVED[\s\S]*UV Layout PASS/);
    expect(phaseContract).toContain("UV Readiness Preflight");
    expect(phaseContract).toContain("Animation Readiness Preflight");
  });

  test("CI routes track the hierarchical docs owners they validate", async () => {
    const [repositoryWorkflow, authoringWorkflow, mcpWorkflow] = await Promise.all([
      text("../.github/workflows/repository-verify.yml"),
      text("../.github/workflows/authoring-policy-verify.yml"),
      text("../.github/workflows/mcp-verify.yml"),
    ]);

    expect(repositoryWorkflow).toContain('"docs/**"');
    expect(authoringWorkflow).toContain('"docs/02-reference/**"');
    expect(authoringWorkflow).toContain('"docs/03-authoring/**"');
    expect(authoringWorkflow).toContain('"docs/04-system/implementation-map.md"');
    expect(mcpWorkflow).toContain('"docs/05-operations/next-action.md"');

    for (const workflow of [repositoryWorkflow, authoringWorkflow, mcpWorkflow]) {
      expect(workflow).not.toContain("docs/knowledge/");
      expect(workflow).not.toContain("docs/foundation/");
    }
  });
});
