import { createHash } from "node:crypto";
import { canonicalJson } from "../../lib/semantic/canonical";
import {
  CAPABILITY_BRANCH_MANIFEST,
  type CapabilityBranchManifestEntry,
} from "./manifest";

export type CapabilitySemanticRecord = CapabilityBranchManifestEntry & {
  semanticFingerprint: string;
};

export function semanticFingerprint(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function recordFingerprint(entry: CapabilityBranchManifestEntry): string {
  return semanticFingerprint({
    id: entry.id,
    capability: entry.capability,
    branch: entry.branch ?? null,
    schemaFields: entry.schemaFields ?? [],
    semantic: entry.semantic ?? null,
    graph: entry.graph ?? null,
  });
}

/**
 * Read-only compiled semantic view of the existing canonical branch manifest.
 * This is a projection, not a second authoring source.
 */
export const CAPABILITY_SEMANTIC_REGISTRY: readonly CapabilitySemanticRecord[] =
  CAPABILITY_BRANCH_MANIFEST.map((entry) => ({
    ...entry,
    semanticFingerprint: recordFingerprint(entry),
  }));

const BY_ID = new Map(
  CAPABILITY_SEMANTIC_REGISTRY.map((entry) => [entry.id, entry] as const)
);

export function semanticRecordById(
  id: CapabilityBranchManifestEntry["id"]
): CapabilitySemanticRecord | null {
  return BY_ID.get(id) ?? null;
}
