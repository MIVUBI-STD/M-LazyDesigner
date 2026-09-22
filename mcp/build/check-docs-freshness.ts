import { resolve } from "node:path";

const packageRoot = resolve(import.meta.dir, "..");
const docsDir = resolve(packageRoot, "docs");
const promptsDir = resolve(packageRoot, "prompts");
const hybridSchemaPath = resolve(
  packageRoot,
  "gateway/experimental/generated/hybrid4Schemas.ts"
);

// Generated artifacts that must stay fresh against their source owners.
// prompts/manifest.json bundles runtime prompt content from prompts/*.md, so a
// source-only edit without `bun run prompts:build` is staleness too.
const targets = [
  { file: "api.json", path: resolve(docsDir, "api.json") },
  { file: "index.html", path: resolve(docsDir, "index.html") },
  {
    file: "../prompts/manifest.json",
    path: resolve(promptsDir, "manifest.json"),
  },
  {
    file: "../gateway/experimental/generated/hybrid4Schemas.ts",
    path: hybridSchemaPath,
  },
] as const;

type TargetFile = (typeof targets)[number]["file"];
const originals = new Map<string, string>();

function normalizeGeneratedAt(file: TargetFile, content: string): string {
  if (
    file === "../gateway/experimental/generated/hybrid4Schemas.ts"
  ) {
    return content;
  }

  if (file === "index.html") {
    return content.replace(
      /Generated [^<\n]+ from Zod schemas/g,
      "Generated <generated-at> from Zod schemas"
    );
  }

  const parsed = JSON.parse(content) as Record<string, unknown>;
  parsed.generatedAt = "<generated-at>";
  return JSON.stringify(parsed, null, 2);
}

async function restoreOriginals(): Promise<void> {
  for (const [path, content] of originals) {
    await Bun.write(path, content);
  }
}

async function runBuildScript(script: string): Promise<void> {
  const build = Bun.spawn(["bun", "run", script], {
    cwd: packageRoot,
    stdout: "inherit",
    stderr: "inherit",
  });

  const buildExitCode = await build.exited;
  if (buildExitCode !== 0) {
    throw new Error(`${script} failed with exit code ${buildExitCode}.`);
  }
}

async function checkDocsFreshness(): Promise<number> {
  for (const target of targets) {
    originals.set(target.path, await Bun.file(target.path).text());
  }

  await runBuildScript("docs:build");
  await runBuildScript("prompts:build");
  await runBuildScript("generate:hybrid4-schemas");

  const stale: string[] = [];
  for (const target of targets) {
    const original = originals.get(target.path);
    if (original === undefined) {
      throw new Error(`Missing original documentation snapshot for ${target.file}.`);
    }

    const generated = await Bun.file(target.path).text();
    if (
      normalizeGeneratedAt(target.file, original) !==
      normalizeGeneratedAt(target.file, generated)
    ) {
      stale.push(target.file);
    }
  }

  if (stale.length === 0) {
    console.log("Generated MCP documentation and Hybrid-4 schemas are fresh.");
    return 0;
  }

  console.error(
    `Generated MCP artifacts are stale: ${stale.join(", ")}. Run \`bun run docs:build\`, \`bun run prompts:build\`, and \`bun run generate:hybrid4-schemas\`, then commit the generated output.`
  );
  return 1;
}

let exitCode = 0;
try {
  exitCode = await checkDocsFreshness();
} catch (error) {
  console.error(error);
  exitCode = 1;
} finally {
  await restoreOriginals();
}

process.exit(exitCode);
