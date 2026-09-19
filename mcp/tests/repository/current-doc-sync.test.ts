import { describe, expect, test } from "bun:test";

async function text(path: string): Promise<string> {
  return Bun.file(path).text();
}

function sourceCount(source: string, pattern: RegExp, label: string): number {
  const raw = source.match(pattern)?.[1];
  if (!raw) throw new Error(`Could not read ${label} from canonical surface measurement source.`);
  return Number(raw);
}

function expectToolCount(body: string, label: string, count: number): void {
  expect(body).toMatch(new RegExp(`${label}\\s+${count}\\s+tools`, "i"));
}

describe("current developer-facing documentation sync", () => {
  test("canonical documentation routing uses the domain hierarchy", async () => {
    const [docs, root, context, flow, implementation, validation, next] = await Promise.all([
      text("../docs/README.md"),
      text("../README.md"),
      text("../CONTEXT.md"),
      text("../docs/01-product/flow.md"),
      text("../docs/04-system/implementation-map.md"),
      text("../docs/05-operations/current-validation.md"),
      text("../docs/05-operations/next-action.md"),
    ]);

    for (const domain of ["01-product", "02-reference", "03-authoring", "04-system", "05-operations"]) {
      expect(docs).toContain(domain);
    }
    for (const owner of [root, context, flow, implementation, validation, next]) {
      expect(owner).not.toContain("docs/knowledge/");
      expect(owner).not.toContain("docs/foundation/");
    }
  });

  test("Runtime source counts stay aligned with developer readmes", async () => {
    const [phaseMeasureSource, rootReadme, mcpReadme, gatewayReadme] = await Promise.all([
      text("scripts/measure-phase-surfaces.ts"),
      text("../README.md"),
      text("README.md"),
      text("gateway/README.md"),
    ]);

    const callableToolCount = sourceCount(phaseMeasureSource, /const CATALOG_TOOL_COUNT = (\d+);/, "callable catalog count");
    const geometryToolCount = sourceCount(phaseMeasureSource, /geometry:\s*(\d+),/, "Geometry surface count");
    const texturingToolCount = sourceCount(phaseMeasureSource, /texturing:\s*(\d+),/, "Texturing surface count");
    const animationToolCount = sourceCount(phaseMeasureSource, /animation:\s*(\d+),/, "Animation surface count");

    expect(geometryToolCount).toBe(texturingToolCount);
    expectToolCount(rootReadme, "Active phase-union catalog", callableToolCount);
    expectToolCount(rootReadme, "AUTHORING source surface", geometryToolCount);
    expectToolCount(rootReadme, "Animation source surface", animationToolCount);
    expectToolCount(mcpReadme, "Active phase-union catalog", callableToolCount);
    expectToolCount(mcpReadme, "AUTHORING surface", geometryToolCount);
    expectToolCount(mcpReadme, "Animation surface", animationToolCount);
    expect(gatewayReadme).toMatch(new RegExp(`Runtime callable union\\s+${callableToolCount}`, "i"));
  });

  test("reference and authoring specialists point to canonical owners", async () => {
    const [reference, modelling] = await Promise.all([
      text("../.agents/skills/lazydesigner-reference-preparation/SKILL.md"),
      text("../.agents/skills/lazydesigner-modelling/SKILL.md"),
    ]);

    expect(reference).toContain("docs/02-reference/image/standard.md");
    expect(reference).toContain("docs/02-reference/package/README.md");
    expect(modelling).toContain("docs/03-authoring/modelling/profiles/README.md");
    for (const owner of [reference, modelling]) {
      expect(owner).not.toContain("docs/knowledge/");
      expect(owner).not.toContain("docs/foundation/");
    }
  });

  test("operations owners keep continuation, proof, and local acceptance separate", async () => {
    const [validation, next, runbook] = await Promise.all([
      text("../docs/05-operations/current-validation.md"),
      text("../docs/05-operations/next-action.md"),
      text("../docs/05-operations/local-acceptance-runbook.md"),
    ]);

    expect(validation).toMatch(/proof interpretation/i);
    expect(next).toMatch(/continuation only/i);
    expect(runbook).toMatch(/local acceptance/i);
    expect(validation).toMatch(/source\/static|static source|source architecture/i);
    expect(runbook).toMatch(/live_blockbench/i);
  });

  test("current ownership docs describe persistent Gateway semantics and split Runtime/Plugin owners", async () => {
    const [agents, implementation, validation, next] = await Promise.all([
      text("AGENTS.md"),
      text("../docs/04-system/implementation-map.md"),
      text("../docs/05-operations/current-validation.md"),
      text("../docs/05-operations/next-action.md"),
    ]);

    for (const owner of [agents, validation, next]) {
      expect(owner).toMatch(/persistent[^\n.]*Gateway|Gateway[^\n.]*persistent/i);
    }
    expect(implementation).toContain("Gateway owns client stability and Runtime recovery");
    expect(agents).toContain("server/runtime/");
    expect(agents).toContain("plugin/runtimeHost.ts");
    expect(implementation).toContain("mcp/server/runtime/bootstrap.ts");
    expect(implementation).toContain("mcp/plugin/blockbenchIntegration.ts");
    expect(implementation).not.toContain("`mcp/server/server.ts` wires");
    expect(agents).not.toContain("reconnected live MCP client");
  });
});
