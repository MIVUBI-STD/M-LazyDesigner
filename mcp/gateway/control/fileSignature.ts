import type { Stats } from "node:fs";

/**
 * Stat-first identity for Control-owned context, approval and reference files.
 * Detects same-size restored-mtime rewrites or atomic replacements while
 * avoiding repeated file reads and SHA calculations on ordinary cache hits.
 * This is not an all-stat-fields-preserved/adversarial integrity guarantee.
 */
export function fileMetadataSignature(
  info: Pick<Stats, "dev" | "ino" | "size" | "mtimeMs" | "ctimeMs">
): string {
  return `${info.dev}:${info.ino}:${info.size}:${info.mtimeMs}:${info.ctimeMs}`;
}
