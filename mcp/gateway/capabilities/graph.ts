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
  succeeded: boolean
): CapabilityFactState {
  if (!succeeded) return previous;

  const branch = capabilityBranchFromArguments(args);
  const entry = capabilityGraphEntry(capability, branch);
  if (!entry) return previous;

  const next: CapabilityFactState = { ...previous };
  for (const fact of entry.invalidates ?? []) next[fact] = false;
  for (const fact of entry.produces ?? []) next[fact] = true;
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
