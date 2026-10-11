/**
 * On-demand, read-only inventory over Git-tracked source files. This is a
 * derived audit, not another knowledge registry, index or runtime database.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { posix, resolve } from "node:path";

export type DataKind = "DOCUMENT" | "OPERATIONS" | "SKILL" | "TEST_FIXTURE" | "COMPATIBILITY_ALIAS";
export type DataEntry = { path: string; kind: DataKind; bytes: number; sha256: string; target?: string; target_tracked?: boolean };
export type DataInventory = {
  schema: 1;
  authority: "DERIVED_READ_ONLY";
  entries: DataEntry[];
  tracked_workspace_file_count: number;
  unresolved_aliases: string[];
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
  for (const path of [...tracked].sort()) {
    const kind = classifyDataSourcePath(path);
    if (!kind && !/^mcp\/lib\/[^/]+\.ts$/.test(path)) continue;
    const data = await read(path);
    const target = kind ? null : compatibilityAliasTarget(path, Buffer.from(data).toString("utf8"));
    if (!kind && !target) continue;
    entries.push({
      path, kind: kind ?? "COMPATIBILITY_ALIAS",
      bytes: data.length, sha256: createHash("sha256").update(data).digest("hex"),
      ...(target ? { target, target_tracked: tracked.has(target) } : {}),
    });
  }
  return {
    schema: 1, authority: "DERIVED_READ_ONLY", entries,
    tracked_workspace_file_count: [...tracked].filter(path => path.startsWith("workspace/")).length,
    unresolved_aliases: entries
      .filter(entry => entry.kind === "COMPATIBILITY_ALIAS" && entry.target_tracked === false)
      .map(entry => entry.path),
  };
}

async function main(): Promise<void> {
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
  if (result.unresolved_aliases.length > 0) process.exitCode = 1;
}
if (import.meta.main) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
