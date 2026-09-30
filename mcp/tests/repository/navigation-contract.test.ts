import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";

const MCP_TOP_LEVEL_DIRECTORIES = [
  "benchmarks",
  "build",
  "compatibility",
  "distribution",
  "docs",
  "gateway",
  "lib",
  "macros",
  "plugin",
  "prompts",
  "scripts",
  "server",
  "tests",
  "ui",
] as const;

const TRANSIENT_WORKTREE_DIRECTORIES = new Set(["dist", "node_modules", "coverage"]);

const REQUIRED_SCRIPT_SUBDIRECTORIES = ["benchmark", "development", "measure"] as const;

const REQUIRED_NAVIGATION_READMES = [
  "gateway/README.md",
  "lib/README.md",
  "server/runtime/README.md",
  "server/tools/README.md",
  "scripts/README.md",
  "scripts/benchmark/README.md",
  "scripts/development/README.md",
  "scripts/measure/README.md",
  "tests/README.md",
  "docs/README.md",
] as const;

const SCRIPT_NAME =
  /^(?:analyze|audit|benchmark|build|compare|deploy|evaluate|finalize|generate|live|measure|plan|report|run|serve|setup|snapshot|summarize|validate|verified|verify)-[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/;

describe("repository navigation contract", () => {
  test("MCP package keeps one intentional top-level directory taxonomy", async () => {
    const directories = (await readdir(".", { withFileTypes: true }))
      .filter(
        (entry) =>
          entry.isDirectory() &&
          !entry.name.startsWith(".") &&
          !TRANSIENT_WORKTREE_DIRECTORIES.has(entry.name)
      )
      .map((entry) => entry.name)
      .sort();

    expect(directories).toEqual([...MCP_TOP_LEVEL_DIRECTORIES].sort());
  });

  test("large navigation surfaces expose a local entry README", async () => {
    for (const path of REQUIRED_NAVIGATION_READMES) {
      expect(await Bun.file(path).exists()).toBe(true);
    }
  });

  test("developer scripts stay visibly taxonomized", async () => {
    const rootEntries = await readdir("scripts", { withFileTypes: true });
    const rootScripts = rootEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
      .map((entry) => entry.name);
    const subdirectories = rootEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    expect(subdirectories).toEqual([...REQUIRED_SCRIPT_SUBDIRECTORIES].sort());

    const subdirectoryScripts = (
      await Promise.all(
        REQUIRED_SCRIPT_SUBDIRECTORIES.map(async (directory) =>
          (await readdir(`scripts/${directory}`, { withFileTypes: true }))
            .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
            .map((entry) => entry.name)
        )
      )
    ).flat();

    const invalid = [...rootScripts, ...subdirectoryScripts]
      .filter((name) => !SCRIPT_NAME.test(name))
      .sort();
    expect(invalid).toEqual([]);
  });

  test("migrated script domains cannot drift back to the scripts root", async () => {
    const rootFiles = (await readdir("scripts", { withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);

    const developmentRootFiles = new Set([
      "analyze-semantic-impact.ts",
      "build-development-symbol-map.ts",
      "build-knowledge-index.ts",
      "plan-affected-execution.ts",
      "plan-development-context.ts",
      "plan-semantic-invalidation.ts",
      "run-affected-execution.ts",
      "snapshot-semantic-registry.ts",
    ]);

    expect(
      rootFiles.filter(
        (name) =>
          developmentRootFiles.has(name) ||
          name.startsWith("measure-") ||
          name.startsWith("benchmark-")
      )
    ).toEqual([]);
  });

  test("generated MCP docs declare their non-canonical role", async () => {
    const readme = await Bun.file("docs/README.md").text();
    expect(readme).toContain("not");
    expect(readme).toContain("../../docs/README.md");
    expect(readme).toContain("api.json");
    expect(readme).toContain("index.html");
  });
});