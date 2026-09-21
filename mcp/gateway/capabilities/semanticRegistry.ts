import { createHash } from "node:crypto";
import { canonicalJson } from "../../lib/semantic/canonical";
import {
  CAPABILITY_BRANCH_MANIFEST,
  manifestEntryForBranch,
  type CapabilityBranchManifestEntry,
} from "./manifest";
import type { CapabilityBranchHint } from "./types";

export type CapabilitySemanticFingerprints = {
  routing: string;
  graph: string;
  schema_projection: string;
  aggregate: string;
};

export type CapabilitySemanticRecord = CapabilityBranchManifestEntry & {
  semanticFingerprint: string;
  fingerprints: CapabilitySemanticFingerprints;
};

export type CapabilitySemanticDiff = {
  id: CapabilitySemanticRecord["id"];
  change: "ADDED" | "REMOVED" | "CHANGED";
  dimensions: Array<"ROUTING" | "GRAPH" | "SCHEMA_PROJECTION">;
};

export function semanticFingerprint(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function recordFingerprints(
  entry: CapabilityBranchManifestEntry
): CapabilitySemanticFingerprints {
  const routing = semanticFingerprint({
    id: entry.id,
    capability: entry.capability,
    branch: entry.branch ?? null,
    semantic: entry.semantic ?? null,
  });
  const graph = semanticFingerprint({
    id: entry.id,
    graph: entry.graph ?? null,
  });
  const schemaProjection = semanticFingerprint({
    id: entry.id,
    schemaFields: entry.schemaFields ?? [],
  });
  return {
    routing,
    graph,
    schema_projection: schemaProjection,
    aggregate: semanticFingerprint({
      routing,
      graph,
      schema_projection: schemaProjection,
    }),
  };
}

/**
 * Read-only compiled semantic view of the existing canonical branch manifest.
 * This is a projection, not a second authoring source.
 */
export const CAPABILITY_SEMANTIC_REGISTRY: readonly CapabilitySemanticRecord[] =
  CAPABILITY_BRANCH_MANIFEST.map((entry) => {
    const fingerprints = recordFingerprints(entry);
    return {
      ...entry,
      fingerprints,
      semanticFingerprint: fingerprints.aggregate,
    };
  });

const BY_ID = new Map(
  CAPABILITY_SEMANTIC_REGISTRY.map((entry) => [entry.id, entry] as const)
);

export function semanticRecordById(
  id: CapabilityBranchManifestEntry["id"]
): CapabilitySemanticRecord | null {
  return BY_ID.get(id) ?? null;
}


export function semanticRecordForCapabilityBranch(
  capability: string,
  branch?: CapabilityBranchHint
): CapabilitySemanticRecord | null {
  const entry = manifestEntryForBranch(capability, branch);
  return entry ? semanticRecordById(entry.id) : null;
}


export function capabilityDescriptionRevision(input: {
  semanticFingerprint?: string | null;
  inputSchema: unknown;
  outputSchema?: unknown;
}): string {
  return semanticFingerprint({
    semantic: input.semanticFingerprint ?? null,
    inputSchema: input.inputSchema,
    outputSchema: input.outputSchema ?? null,
  });
}


export function diffCapabilitySemanticRegistry(
  before: readonly CapabilitySemanticRecord[],
  after: readonly CapabilitySemanticRecord[]
): CapabilitySemanticDiff[] {
  const beforeById = new Map(before.map((entry) => [entry.id, entry] as const));
  const afterById = new Map(after.map((entry) => [entry.id, entry] as const));
  const ids = [...new Set([...beforeById.keys(), ...afterById.keys()])]
    .sort((left, right) => left.localeCompare(right));
  const diffs: CapabilitySemanticDiff[] = [];

  for (const id of ids) {
    const previous = beforeById.get(id);
    const next = afterById.get(id);
    if (!previous && next) {
      diffs.push({
        id,
        change: "ADDED",
        dimensions: ["ROUTING", "GRAPH", "SCHEMA_PROJECTION"],
      });
      continue;
    }
    if (previous && !next) {
      diffs.push({
        id,
        change: "REMOVED",
        dimensions: ["ROUTING", "GRAPH", "SCHEMA_PROJECTION"],
      });
      continue;
    }
    if (!previous || !next || previous.semanticFingerprint === next.semanticFingerprint) {
      continue;
    }

    const dimensions: CapabilitySemanticDiff["dimensions"] = [];
    if (previous.fingerprints.routing !== next.fingerprints.routing) {
      dimensions.push("ROUTING");
    }
    if (previous.fingerprints.graph !== next.fingerprints.graph) {
      dimensions.push("GRAPH");
    }
    if (
      previous.fingerprints.schema_projection !==
      next.fingerprints.schema_projection
    ) {
      dimensions.push("SCHEMA_PROJECTION");
    }
    diffs.push({ id, change: "CHANGED", dimensions });
  }

  return diffs;
}
