import {
  BUILD_ID_GLOBAL,
  MCP_BUNDLE_FILENAME,
} from "./engineering-identifiers";

export { MCP_BUNDLE_FILENAME };
/** @deprecated Internal source import alias. */
export { LEGACY_MCP_BUNDLE_FILENAME } from "./engineering-identifiers";

export type PluginBuildIdentity = `sha256:${string}`;
/** @deprecated Internal source import alias. */
export type LegacyMcpBuildIdentity = PluginBuildIdentity;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractPluginBuildIdentity(
  content: string
): PluginBuildIdentity {
  const key = escapeRegExp(BUILD_ID_GLOBAL);
  const pattern = new RegExp(
    `globalThis(?:\\.${key}|\\[["']${key}["']\\])\\s*=\\s*["'](sha256:[a-f0-9]{64})["']`
  );
  const match = content.match(pattern);
  if (!match?.[1]) {
    throw new Error("Built plugin is missing a valid embedded build_identity.");
  }
  return match[1] as PluginBuildIdentity;
}

/** @deprecated Internal source import alias for canonical build banner. */
export const extractLegacyMcpBuildIdentity = extractPluginBuildIdentity;
