/**
 * On-demand, read-only inventory over Git-tracked source files. This is a
 * derived audit, not another knowledge registry, index or runtime database.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { posix, resolve } from "node:path";
import { indexExplicitDocumentationEdges } from "../../lib/semantic/knowledge";
import { FIXTURE_CONTRACT_TESTS_BY_PATH } from "../../gateway/development/affectedExecution";

export type DataKind = "DOCUMENT" | "OPERATIONS" | "SKILL" | "TEST_FIXTURE" | "COMPATIBILITY_ALIAS";
export type DataEntry = { path: string; kind: DataKind; bytes: number; sha256: string; target?: string; target_tracked?: boolean };
export type BrokenDocumentLink = { source: string; line: number; label: string; target: string };
export type FixtureConsumerIssue = {
  fixture: string; reason: "UNMAPPED" | "MISSING_CONSUMER"; consumer?: string;
};
export type DataInventory = {
  schema: 1;
  authority: "DERIVED_READ_ONLY";
  entries: DataEntry[];
  tracked_workspace_file_count: number;
  unresolved_aliases: string[];
  alias_chains: string[];
  broken_document_links: BrokenDocumentLink[];
  fixture_consumer_issues: FixtureConsumerIssue[];
};
const root = resolve(import.meta.dir, "../../..");

export function classifyDataSourcePath(path: string): Exclude<DataKind, "COMPATIBILITY_ALIAS"> | null {
  if (path.startsWith("docs/05-operations/") && path.endsWith(".md")) return "OPERATIONS";
  if (path.startsWith("docs/") && path.endsWith(".md")) return "DOCUMENT";
  if (path.startsWith(".agents/skills/") && path.endsWith(".md")) return "SKILL";
  if (path.startsWith("mcp/tests/fixtures/") && path.endsWith(".json")) return "TEST_FIXTURE";
  return null;
}

export function compatibilityAliasTarget(path: string, source: string): string | null {
  if (!/^mcp\/lib\/[^/]+\.ts$/.test(path)) return null;
  const match = source.trim().match(/^export\s+\*\s+from\s+["'](\.[^"']+)["'];?$/);
  if (!match) return null;
  const target = posix.normalize(posix.join(posix.dirname(path), match[1]!));
  return target.endsWith(".ts") ? target : target + ".ts";
}

export async function buildDataInventory(
  trackedPaths: readonly string[],
  read: (path: string) => Promise<Uint8Array>,
): Promise<DataInventory> {
  const tracked = new Set(trackedPaths);
  const entries: DataEntry[] = [];
  const brokenDocumentLinks: BrokenDocumentLink[] = [];
  for (const path of [...tracked].sort()) {
    const kind = classifyDataSourcePath(path);
    if (!kind && !/^mcp\/lib\/[^/]+\.ts$/.test(path)) continue;
    const data = await read(path);
    const text = Buffer.from(data).toString("utf8");
    const target = kind ? null : compatibilityAliasTarget(path, text);
    if (!kind && !target) continue;
    entries.push({
      path, kind: kind ?? "COMPATIBILITY_ALIAS",
      bytes: data.length, sha256: createHash("sha256").update(data).digest("hex"),
      ...(target ? { target, target_tracked: tracked.has(target) } : {}),
    });
    if ((kind === "DOCUMENT" || kind === "OPERATIONS") && path.startsWith("docs/")) {
      for (const link of indexExplicitDocumentationEdges(path, text)) {
        if (!tracked.has(link.to)) {
          brokenDocumentLinks.push({
            source: path, line: link.line, label: link.label, target: link.to,
          });
        }
      }
    }
  }
  const fixtureConsumerIssues: FixtureConsumerIssue[] = [];
  for (const entry of entries) {
    if (entry.kind !== "TEST_FIXTURE") continue;
    // Read the existing affected-execution map; never copy ownership facts.
    const consumers = FIXTURE_CONTRACT_TESTS_BY_PATH[entry.path];
    if (!consumers?.length) {
      fixtureConsumerIssues.push({ fixture: entry.path, reason: "UNMAPPED" });
    } else {
      for (const consumer of consumers) {
        if (!tracked.has(consumer)) {
          fixtureConsumerIssues.push({ fixture: entry.path, reason: "MISSING_CONSUMER", consumer });
        }
      }
    }
  }
  const aliases = entries.filter(entry => entry.kind === "COMPATIBILITY_ALIAS");
  const aliasPaths = new Set(aliases.map(entry => entry.path));
  return {
    schema: 1, authority: "DERIVED_READ_ONLY", entries,
    tracked_workspace_file_count: [...tracked].filter(path => path.startsWith("workspace/")).length,
    unresolved_aliases: aliases
      .filter(entry => entry.target_tracked === false)
      .map(entry => entry.path),
    alias_chains: aliases
      .filter(entry => entry.target && aliasPaths.has(entry.target))
      .map(entry => entry.path),
    broken_document_links: brokenDocumentLinks,
    fixture_consumer_issues: fixtureConsumerIssues,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--strict") ||
      args.filter(arg => arg === "--strict").length > 1) {
    throw new Error("Data audit accepts only optional --strict.");
  }
  const strict = args.includes("--strict");
  const raw = execFileSync("git", ["ls-files", "-z"], { cwd: root, maxBuffer: 2 * 1024 * 1024 }).toString("utf8");
  const paths = raw.split("\0").filter(Boolean);
  const result = await buildDataInventory(paths, async path => {
    const filePath = resolve(root, path);
    if (!filePath.startsWith(root + "/") && !filePath.startsWith(root + "\\")) {
      throw new Error("Inventory path escapes repository.");
    }
    const meta = await lstat(filePath);
    if (!meta.isFile() || meta.isSymbolicLink()) throw new Error("Unsafe tracked data source: " + path);
    return readFile(filePath);
  });
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (result.unresolved_aliases.length > 0 || result.fixture_consumer_issues.length > 0 ||
      (strict && (result.broken_document_links.length > 0 || result.alias_chains.length > 0))) {
    process.exitCode = 1;
  }
}
if (import.meta.main) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
