import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, delimiter, dirname, join, resolve } from "node:path";

const packageRoot = resolve(import.meta.dir, "..");
const originals: Record<string, string> = {
  "docs/api.json": '{\n  "generatedAt": "before",\n  "tools": ["fixture"]\n}\n',
  "docs/index.html": "<p>Generated before from Zod schemas</p>\n",
  "prompts/manifest.json": '{\n  "version": "fixture",\n  "prompts": ["current"]\n}\n',
  "gateway/experimental/generated/hybrid4Schemas.ts":
    '// GENERATED fixture after\nexport const HYBRID_4_GENERATED_SCHEMAS = {} as const;\n',
};
const generated: Record<string, string> = {
  "docs/api.json": '{"generatedAt":"after","tools":["fixture"]}',
  "docs/index.html": "<p>Generated after from Zod schemas</p>\n",
  "prompts/manifest.json": '{"version":"fixture","prompts":["current"]}',
  "gateway/experimental/generated/hybrid4Schemas.ts":
    '// GENERATED fixture after\nexport const HYBRID_4_GENERATED_SCHEMAS = {} as const;\n',
};

async function snapshot(root: string): Promise<Record<string, string>> {
  return Object.fromEntries(await Promise.all(Object.keys(originals).map(async (file) => [
    file, await Bun.file(join(root, file)).text(),
  ])));
}

// Exercise the real checker and package command composition without recursively
// running the test suite or touching committed outputs. Only producers and the
// unrelated checks are controlled fixtures; this is not generator-content proof.
async function withFixture(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "blockit-freshness-"));
  try {
    for (const directory of [
      "build",
      "docs",
      "prompts",
      "gateway/experimental/generated",
    ]) {
      await mkdir(join(root, directory), { recursive: true });
    }
    const { scripts: canonical } = await Bun.file(join(packageRoot, "package.json")).json() as {
      scripts: Record<string, string>;
    };
    const scripts = Object.fromEntries(Object.keys(canonical).map((name) => [
      name, "bun run ./other-check.ts",
    ]));
    for (const name of ["docs:check", "verify:mcp", "build"]) scripts[name] = canonical[name];
    scripts["docs:build"] = "bun run ./fixture-generator.ts docs";
    scripts["prompts:build"] = "bun run ./fixture-generator.ts prompts";
    scripts["generate:hybrid4-schemas"] =
      "bun run ./fixture-generator.ts hybrid";
    await Bun.write(join(root, "package.json"), JSON.stringify({ private: true, type: "module", scripts }));
    await copyFile(join(packageRoot, "build/check-docs-freshness.ts"), join(root, "build/check-docs-freshness.ts"));
    await Bun.write(join(root, "expected.json"), JSON.stringify(generated));
    await Bun.write(join(root, "other-check.ts"), 'await Bun.write("other-check-ran", "yes");\n');
    await Bun.write(join(root, "build/index.ts"), 'await Bun.write("build-ran", "yes");\n');
    await Bun.write(join(root, "fixture-generator.ts"), `
const stage = process.argv[2];
if (!["docs", "prompts", "hybrid"].includes(stage)) {
  throw new Error("Invalid fixture stage");
}
const outputs = await Bun.file("expected.json").json();
for (const [file, content] of Object.entries(outputs)) {
  const owned =
    file.startsWith(stage + "/") ||
    (stage === "hybrid" &&
      file === "gateway/experimental/generated/hybrid4Schemas.ts");
  if (owned) await Bun.write(file, content as string);
}
const failure = Bun.file("fail-stage");
if (await failure.exists() && (await failure.text()) === stage) process.exit(7);
`);
    for (const [file, content] of Object.entries(originals)) await Bun.write(join(root, file), content);
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function runScript(root: string, script: "docs:check" | "verify:mcp") {
  const result = spawnSync(process.execPath, ["run", script], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, PATH: dirname(process.execPath) + delimiter + (process.env.PATH ?? "") },
    timeout: 10_000,
    maxBuffer: 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`Fixture terminated by ${result.signal}`);
  return { status: result.status, output: result.stdout + result.stderr };
}

describe("generated freshness before build", () => {
  test("fresh outputs pass and the checker restores original bytes", async () => {
    await withFixture(async (root) => {
      const before = await snapshot(root);
      const result = runScript(root, "docs:check");
      expect(result.status, result.output).toBe(0);
      expect(await snapshot(root)).toEqual(before);
    });
  }, 20_000);

  for (const file of Object.keys(originals)) {
    test(`stale ${file} fails without changing checkout bytes`, async () => {
      await withFixture(async (root) => {
        const content = file.endsWith(".html")
          ? originals[file] + "<p>stale</p>\n"
          : file.endsWith(".ts")
            ? originals[file] + "// stale\n"
            : JSON.stringify({ ...JSON.parse(originals[file]), stale: true });
        await Bun.write(join(root, file), content);
        const before = await snapshot(root);
        const result = runScript(root, "docs:check");
        expect(result.status, result.output).toBe(1);
        expect(result.output).toContain("stale");
        expect(result.output).toContain(basename(file));
        expect(await snapshot(root)).toEqual(before);
      });
    }, 20_000);
  }

  for (const stage of ["docs", "prompts", "hybrid"]) {
    test(`${stage} generator failure restores outputs already written`, async () => {
      await withFixture(async (root) => {
        await Bun.write(join(root, "fail-stage"), stage);
        const before = await snapshot(root);
        const result = runScript(root, "docs:check");
        expect(result.status, result.output).toBe(1);
        expect(result.output).toContain(
          stage === "hybrid"
            ? "generate:hybrid4-schemas failed with exit code 7"
            : `${stage}:build failed with exit code 7`
        );
        expect(await snapshot(root)).toEqual(before);
      });
    }, 20_000);
  }

  test("canonical MCP gate rejects a stale manifest before any later check or build", async () => {
    await withFixture(async (root) => {
      await Bun.write(join(root, "prompts/manifest.json"), '{"version":"fixture","prompts":["stale"]}\n');
      const before = await snapshot(root);
      const result = runScript(root, "verify:mcp");
      expect(result.status, result.output).toBe(1);
      expect(result.output).toContain("manifest.json");
      expect(await Bun.file(join(root, "other-check-ran")).exists()).toBe(false);
      expect(await Bun.file(join(root, "build-ran")).exists()).toBe(false);
      expect(await snapshot(root)).toEqual(before);
    });
  }, 20_000);

  test("canonical MCP gate reaches the build when generated outputs are fresh", async () => {
    await withFixture(async (root) => {
      const result = runScript(root, "verify:mcp");
      expect(result.status, result.output).toBe(0);
      expect(await Bun.file(join(root, "other-check-ran")).exists()).toBe(true);
      expect(await Bun.file(join(root, "build-ran")).exists()).toBe(true);
    });
  }, 20_000);
});
