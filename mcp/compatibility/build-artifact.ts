import {
  LEGACY_BUILD_ID_GLOBAL,
  LEGACY_MCP_BUNDLE_FILENAME,
} from "./engineering-identifiers";

export { LEGACY_MCP_BUNDLE_FILENAME };

export type LegacyMcpBuildIdentity = `sha256:${string}`;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractLegacyMcpBuildIdentity(
  content: string
): LegacyMcpBuildIdentity {
  const key = escapeRegExp(LEGACY_BUILD_ID_GLOBAL);
  const pattern = new RegExp(
    `globalThis(?:\\.${key}|\\[["']${key}["']\\])\\s*=\\s*["'](sha256:[a-f0-9]{64})["']`
  );
  const match = content.match(pattern);
  if (!match?.[1]) {
    throw new Error("Built plugin is missing a valid embedded build_identity.");
  }
  return match[1] as LegacyMcpBuildIdentity;
}
