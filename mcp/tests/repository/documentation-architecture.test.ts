import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { indexExplicitDocumentationEdges } from "../../lib/semantic/knowledge";

async function text(path: string): Promise<string> {
  return Bun.file(path).text();
}

async function walkFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) out.push(...(await walkFiles(path)));
    else out.push(path);
  }
  return out;
}

describe("AI-first documentation architecture", () => {
  test("docs root exposes exactly one entry point plus five canonical domains", async () => {
    const entries = (await readdir("../docs", { withFileTypes: true }))
      .map((entry) => entry.name)
      .sort();

    expect(entries).toEqual([
      "01-product",
      "02-reference",
      "03-authoring",
      "04-system",
      "05-operations",
      "README.md",
    ]);

    expect(await Bun.file("../docs/foundation").exists()).toBe(false);
    expect(await Bun.file("../docs/knowledge").exists()).toBe(false);
  });

  test("every domain has a navigation README and core system owners resolve", async () => {
    for (const domain of [
      "01-product",
      "02-reference",
      "03-authoring",
      "04-system",
      "05-operations",
    ]) {
      expect(await Bun.file(`../docs/${domain}/README.md`).exists()).toBe(true);
    }

    for (const owner of [
      "../docs/04-system/ai-context-loading.md",
      "../docs/04-system/authoring-stage-context.md",
      "../docs/04-system/control/context-projection.md",
      "../docs/04-system/implementation-map.md",
      "../docs/04-system/skill-taxonomy.md",
    ]) {
      expect(await Bun.file(owner).exists()).toBe(true);
    }
  });

  test("AI entry point routes by domain and defines non-overlapping authority roles", async () => {
    const root = await text("../docs/README.md");

    for (const domain of [
      "01-product/",
      "02-reference/",
      "03-authoring/",
      "04-system/",
      "05-operations/",
    ]) {
      expect(root).toContain(domain);
    }

    expect(root).toContain("04-system/ai-context-loading.md");
    expect(root).toContain("Docs     = durable semantic policy / contracts");
    expect(root).toContain("Skills   = execution procedure");
    expect(root).toContain("Control  = task/stage/context selection and projection");
    expect(root).toMatch(/Do not read all documentation by default/i);
  });

  test("system documentation router links remain explicit, unique and resolvable", async () => {
    const root = await text("../docs/README.md");
    const rootRoutes = indexExplicitDocumentationEdges("docs/README.md", root)
      .filter((edge) => edge.label === "System documentation router");
    expect(rootRoutes).toHaveLength(1);
    expect(rootRoutes[0]?.to).toBe("docs/04-system/README.md");
    expect(await Bun.file("../" + rootRoutes[0]!.to).exists()).toBe(true);

    const system = await text("../" + rootRoutes[0]!.to);
    const systemRoutes = indexExplicitDocumentationEdges(rootRoutes[0]!.to, system);
    for (const [label, expectedPath] of [
      ["Implementation Map", "docs/04-system/implementation-map.md"],
      ["Development Operating Standard", "docs/04-system/development-operating-standard.md"],
      ["AI Context Loading", "docs/04-system/ai-context-loading.md"],
      ["Module Boundaries", "docs/04-system/module-boundaries.md"],
    ] as const) {
      const edges = systemRoutes.filter((edge) => edge.label === label);
      expect(edges, label).toHaveLength(1);
      expect(edges[0]?.to, label).toBe(expectedPath);
      expect(await Bun.file("../" + edges[0]!.to).exists(), label).toBe(true);
      expect(edges[0]?.relation).toBe("EXPLICIT_MARKDOWN_LINK");
    }
  });

  test("secondary canonical knowledge routes are explicit and resolvable", async () => {
    const routes = [
      ["docs/04-system/README.md", "External Quality Intelligence", "docs/04-system/external-quality-intelligence.md"],
      ["docs/04-system/README.md", "Prompt Cache and Compaction", "docs/04-system/prompt-cache-and-compaction.md"],
      ["docs/04-system/README.md", "Historical Zero-Waste Plan", "docs/04-system/zero-waste-token-efficiency-plan.md"],
      ["docs/05-operations/README.md", "Native 5.2 Adoption", "docs/05-operations/blockbench-5.2-native-adoption.md"],
      ["docs/02-reference/package/README.md", "Particle Handoff", "docs/02-reference/package/particle-handoff.md"],
      ["docs/02-reference/particle/README.md", "Particle Knowledge Map", "docs/02-reference/particle/knowledge-map.md"],
      ["docs/02-reference/particle/README.md", "Current Particle Status", "docs/02-reference/particle/STATUS.md"],
    ] as const;
    for (const [router, label, target] of routes) {
      const edges = indexExplicitDocumentationEdges(router, await text("../" + router))
        .filter(edge => edge.label === label);
      expect(edges, label).toHaveLength(1);
      expect(edges[0]?.to, label).toBe(target);
      expect(await Bun.file("../" + target).exists(), target).toBe(true);
    }
    const map = await text("../docs/02-reference/particle/knowledge-map.md");
    const edges = indexExplicitDocumentationEdges("docs/02-reference/particle/knowledge-map.md", map)
      .filter(edge => edge.to.startsWith("docs/02-reference/particle/"));
    const names = edges.map(edge => edge.to.split("/").pop()!).sort();
    const files = (await readdir("../docs/02-reference/particle", { withFileTypes: true }))
      .filter(entry => entry.isFile() && entry.name.endsWith(".md") &&
        !["README.md", "knowledge-map.md", "STATUS.md"].includes(entry.name))
      .map(entry => entry.name).sort();
    expect(names).toEqual(files);
    for (const edge of edges) {
      expect(edge.relation).toBe("EXPLICIT_MARKDOWN_LINK");
      expect(await Bun.file("../" + edge.to).exists(), edge.to).toBe(true);
    }
  });

  test("context loading contract defines bounded bundles for every active task class", async () => {
    const [context, sharedStage, taxonomy] = await Promise.all([
      text("../docs/04-system/ai-context-loading.md"),
      text("../docs/04-system/authoring-stage-context.md"),
      text("../docs/04-system/skill-taxonomy.md"),
    ]);

    for (const task of [
      "REFERENCE_PREPARATION",
      "GEOMETRY",
      "TEXTURING",
      "ANIMATION",
      "SYSTEM_DEVELOPMENT",
    ]) {
      expect(context).toContain(task);
    }

    for (const loadClass of ["REQUIRED", "CONDITIONAL", "EXCLUDED"]) {
      expect(context).toContain(loadClass);
    }

    expect(context).toContain("authoring-stage-context.md");
    expect(context).toContain("exactly one selected profile");
    expect(context).toContain("Do not reload the initial package");
    expect(context).toMatch(/read all docs|load all docs/i);
    expect(sharedStage).toContain("stage-specific projection from LazyDesigner Control");
    expect(sharedStage).toContain("Domain-specific reasoning remains in the relevant specialist Skill");
    expect(taxonomy).toContain("shared semantic contract, not a Skill or router");
  });

  test("Skill taxonomy points to current hierarchy and keeps Docs/Skills/Control roles separate", async () => {
    const taxonomy = await text("../docs/04-system/skill-taxonomy.md");

    expect(taxonomy).toContain("docs/02-reference/flow.md");
    expect(taxonomy).toContain("docs/04-system/ai-context-loading.md");
    expect(taxonomy).toContain("authoring-stage-context.md");
    expect(taxonomy).toContain("Docs   = durable semantic policy / contracts");
    expect(taxonomy).toContain("Skills = execution procedure");
    expect(taxonomy).not.toContain("docs/knowledge/");
    expect(taxonomy).not.toContain("docs/foundation/");
  });

  test("active AI-facing documentation and Skills never route through removed legacy docs", async () => {
    const scanRoots = ["../docs", "../.agents/skills"];
    const files = (
      await Promise.all(scanRoots.map((root) => walkFiles(root)))
    ).flat();

    files.push(
      "../README.md",
      "../AGENTS.md",
      "../CONTEXT.md",
      "../GITHUB_RULES.md",
      "../CONTRIBUTING.md",
      "AGENTS.md",
      "README.md"
    );

    const stale: string[] = [];
    for (const file of files) {
      if (!/\.(md|txt)$/i.test(file)) continue;
      const content = await text(file);
      if (content.includes("docs/knowledge/") || content.includes("docs/foundation/")) {
        stale.push(relative("..", file));
      }
    }

    expect(stale).toEqual([]);
  });
});
