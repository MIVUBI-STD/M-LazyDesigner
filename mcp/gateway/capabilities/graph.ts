import {
  cubeChangedFieldsFromResult,
  cubeSemanticScopesFromChangedFields,
  isCubeCreationReceipt,
  isCubeNoChangeReceipt,
} from "../../lib/receipts/cubeMutation";
import {
  CAPABILITY_BRANCH_MANIFEST,
  manifestEntryForBranch,
  type CapabilityGraphSpec,
} from "./manifest";
import type {
  CapabilityBranchHint,
  CapabilityFact,
  CapabilityFactState,
  CapabilityEligibility,
} from "./types";

export type {
  CapabilityFact,
  CapabilityFactState,
  CapabilityEligibility,
} from "./types";

export type CapabilityGraphEntry = {
  capability: string;
  branch?: CapabilityBranchHint;
  requires?: readonly CapabilityFact[];
  produces?: readonly CapabilityFact[];
  invalidates?: readonly CapabilityFact[];
  predecessor?: {
    capability: string;
    branch?: CapabilityBranchHint;
  };
};

export type CapabilityPreconditionEvaluation = {
  eligibility: CapabilityEligibility;
  missing: CapabilityFact[];
  unknown: CapabilityFact[];
  predecessor?: CapabilityGraphEntry["predecessor"];
};

function graphEntryFromManifest(
  capability: string,
  branch?: CapabilityBranchHint
): CapabilityGraphEntry | null {
  const manifest = manifestEntryForBranch(capability, branch);
  if (!manifest?.graph) return null;
  return {
    capability: manifest.capability,
    ...(manifest.branch ? { branch: manifest.branch } : {}),
    ...(manifest.graph as CapabilityGraphSpec),
  };
}

export function capabilityGraphEntry(
  capability: string,
  branch?: CapabilityBranchHint
): CapabilityGraphEntry | null {
  return graphEntryFromManifest(capability, branch);
}

export function evaluateCapabilityPreconditions(
  capability: string,
  branch: CapabilityBranchHint | undefined,
  facts: CapabilityFactState | undefined
): CapabilityPreconditionEvaluation {
  const entry = capabilityGraphEntry(capability, branch);
  const requires = entry?.requires ?? [];
  if (requires.length === 0) {
    return { eligibility: "READY", missing: [], unknown: [] };
  }

  const missing: CapabilityFact[] = [];
  const unknown: CapabilityFact[] = [];
  for (const fact of requires) {
    const value = facts?.[fact] ?? "unknown";
    if (value === false) missing.push(fact);
    else if (value === "unknown") unknown.push(fact);
  }

  return {
    eligibility:
      missing.length > 0
        ? "BLOCKED"
        : unknown.length > 0
          ? "UNKNOWN"
          : "READY",
    missing,
    unknown,
    ...(entry?.predecessor ? { predecessor: entry.predecessor } : {}),
  };
}

export function capabilityBranchFromArguments(
  args: Record<string, unknown>
): CapabilityBranchHint | undefined {
  const discriminator = ["operation", "type", "mode", "action", "resource_kind"]
    .map((field) => ({ field, value: args[field] }))
    .find((candidate) => typeof candidate.value === "string");
  return discriminator
    ? { field: discriminator.field, value: discriminator.value as string }
    : undefined;
}

export function applyCapabilityGraphOutcome(
  previous: CapabilityFactState,
  capability: string,
  args: Record<string, unknown>,
  succeeded: boolean,
  result?: unknown
): CapabilityFactState {
  if (!succeeded) return previous;

  // Undo/Redo can restore or remove previously authored facts. Do not
  // assert missing or present without a current Runtime inspection.
  if (capability === "undo" || capability === "redo") {
    return seedCapabilityFacts({
      projectBound: previous.project_bound === true
        ? true
        : previous.project_bound === false ? false : null,
    });
  }

  const branch = capabilityBranchFromArguments(args);
  const entry = capabilityGraphEntry(capability, branch);
  if (!entry) return previous;

  // Native simplify dry-run and unchanged receipts mutate no authored state.
  // Reuse the same receipt meaning as Control; planned updates are not writes.
  if (capability === "manage_cubes" && branch?.value === "simplify" &&
      isCubeNoChangeReceipt(result)) return previous;

  const next: CapabilityFactState = { ...previous };
  // Match Control's canonical Cube receipt semantics. Only bounded updates
  // with complete field evidence can preserve unrelated accepted facts.
  // Create/simplify/missing receipt deliberately stay conservative.
  const scopedCubeUpdate =
    capability === "manage_cubes" &&
    (branch?.value === "update" || branch?.value === "batch_update");
  const changedFields = scopedCubeUpdate
    ? cubeChangedFieldsFromResult(result)
    : [];
  const staleScopes = changedFields.length > 0
    ? cubeSemanticScopesFromChangedFields(changedFields)
    : null;
  for (const fact of entry.invalidates ?? []) {
    if (staleScopes &&
      fact === "uv_layout_current" &&
      !staleScopes.includes("UV_MAPPING")) continue;
    if (staleScopes &&
      fact === "texture_alignment_current" &&
      !staleScopes.includes("TEXTURE_APPEARANCE")) continue;
    next[fact] = false;
  }
  for (const fact of entry.produces ?? []) {
    if (capability === "manage_cubes" && branch?.value === "create" &&
        fact === "geometry_available" && !isCubeCreationReceipt(result)) {
      // A non-error MCP response without a native creation receipt is
      // ambiguous, not proof that geometry now exists. Preserve prior
      // confirmed existence, but revoke any stale known-absent assertion.
      if (previous.geometry_available !== true) next.geometry_available = "unknown";
      continue;
    }
    next[fact] = true;
  }
  return next;
}

export function seedCapabilityFacts(input: {
  projectBound?: boolean | null;
}): CapabilityFactState {
  return {
    project_bound:
      input.projectBound === true
        ? true
        : input.projectBound === false
          ? false
          : "unknown",
  };
}

export function listCapabilityGraph(): readonly CapabilityGraphEntry[] {
  return CAPABILITY_BRANCH_MANIFEST
    .filter((entry) => entry.graph)
    .map((entry) => ({
      capability: entry.capability,
      ...(entry.branch ? { branch: entry.branch } : {}),
      ...(entry.graph as CapabilityGraphSpec),
    }));
}
