import type { CapabilityBranchHint } from "./capabilityIntelligence";

export type CapabilityFact =
  | "project_bound"
  | "geometry_available"
  | "uv_plan_available"
  | "uv_layout_current"
  | "texture_available"
  | "material_available"
  | "animation_available"
  | "particle_available"
  | "visual_evidence_current"
  | "texture_alignment_current";

export type CapabilityFactValue = true | false | "unknown";

export type CapabilityFactState = Partial<Record<CapabilityFact, CapabilityFactValue>>;

export type CapabilityEligibility = "READY" | "UNKNOWN" | "BLOCKED";

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

const GRAPH: readonly CapabilityGraphEntry[] = [
  {
    capability: "manage_cubes",
    branch: { field: "operation", value: "create" },
    requires: ["project_bound"],
    produces: ["geometry_available"],
    invalidates: ["uv_layout_current", "texture_alignment_current", "visual_evidence_current"],
  },
  {
    capability: "manage_cubes",
    branch: { field: "operation", value: "update" },
    requires: ["project_bound", "geometry_available"],
    produces: ["geometry_available"],
    invalidates: ["uv_layout_current", "texture_alignment_current", "visual_evidence_current"],
  },
  {
    capability: "manage_cubes",
    branch: { field: "operation", value: "batch_update" },
    requires: ["project_bound", "geometry_available"],
    produces: ["geometry_available"],
    invalidates: ["uv_layout_current", "texture_alignment_current", "visual_evidence_current"],
  },
  {
    capability: "manage_cubes",
    branch: { field: "operation", value: "simplify" },
    requires: ["project_bound", "geometry_available"],
    produces: ["geometry_available"],
    invalidates: ["uv_layout_current", "texture_alignment_current", "visual_evidence_current"],
  },
  {
    capability: "manage_uv_layout",
    branch: { field: "operation", value: "plan" },
    requires: ["project_bound", "geometry_available"],
    produces: ["uv_plan_available"],
  },
  {
    capability: "manage_uv_layout",
    branch: { field: "operation", value: "apply" },
    requires: ["project_bound", "geometry_available", "uv_plan_available"],
    produces: ["uv_layout_current"],
    invalidates: ["texture_alignment_current", "visual_evidence_current"],
    predecessor: {
      capability: "manage_uv_layout",
      branch: { field: "operation", value: "plan" },
    },
  },
  {
    capability: "create_texture",
    branch: { field: "type", value: "blank" },
    requires: ["project_bound"],
    produces: ["texture_available"],
    invalidates: ["visual_evidence_current"],
  },
  {
    capability: "create_texture",
    branch: { field: "type", value: "template" },
    requires: ["project_bound", "geometry_available"],
    produces: ["texture_available"],
    invalidates: ["visual_evidence_current"],
  },
  {
    capability: "create_texture",
    branch: { field: "type", value: "variant" },
    requires: ["project_bound", "texture_available"],
    produces: ["texture_available"],
    invalidates: ["visual_evidence_current"],
    predecessor: {
      capability: "create_texture",
      branch: { field: "type", value: "blank" },
    },
  },
  {
    capability: "gradient_tool",
    requires: ["project_bound", "texture_available"],
    produces: ["texture_available"],
    invalidates: ["visual_evidence_current"],
  },
  {
    capability: "paint_texture_transaction",
    requires: ["project_bound", "texture_available"],
    produces: ["texture_available"],
    invalidates: ["visual_evidence_current"],
  },
  {
    capability: "paint_with_brush",
    requires: ["project_bound", "texture_available"],
    produces: ["texture_available"],
    invalidates: ["visual_evidence_current"],
  },
  {
    capability: "manage_material",
    branch: { field: "operation", value: "create" },
    requires: ["project_bound"],
    produces: ["material_available"],
  },
  {
    capability: "manage_material",
    branch: { field: "operation", value: "configure" },
    requires: ["project_bound", "material_available"],
    produces: ["material_available"],
  },
  {
    capability: "create_animation",
    requires: ["project_bound", "geometry_available"],
    produces: ["animation_available"],
  },
  {
    capability: "manage_animation_timeline",
    requires: ["project_bound", "animation_available"],
    produces: ["animation_available"],
    invalidates: ["visual_evidence_current"],
  },
  {
    capability: "manage_animation_effects",
    requires: ["project_bound", "animation_available"],
    produces: ["animation_available"],
  },
  {
    capability: "manage_animation_controller",
    requires: ["project_bound", "animation_available"],
    produces: ["animation_available"],
  },
  {
    capability: "inspect_particle",
    requires: ["project_bound", "particle_available"],
  },
  {
    capability: "manage_particle",
    requires: ["project_bound"],
    produces: ["particle_available"],
    invalidates: ["visual_evidence_current"],
  },
  {
    capability: "capture_model_views",
    requires: ["project_bound", "geometry_available"],
    produces: ["visual_evidence_current"],
  },
];

function sameBranch(
  left: CapabilityBranchHint | undefined,
  right: CapabilityBranchHint | undefined
): boolean {
  if (!left || !right) return left === right;
  return left.field === right.field && left.value === right.value;
}

export function capabilityGraphEntry(
  capability: string,
  branch?: CapabilityBranchHint
): CapabilityGraphEntry | null {
  const exact = GRAPH.find(
    (entry) => entry.capability === capability && sameBranch(entry.branch, branch)
  );
  if (exact) return exact;
  return (
    GRAPH.find(
      (entry) => entry.capability === capability && entry.branch === undefined
    ) ?? null
  );
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

export function applyCapabilityGraphOutcome(
  previous: CapabilityFactState,
  capability: string,
  args: Record<string, unknown>,
  succeeded: boolean
): CapabilityFactState {
  if (!succeeded) return previous;

  const discriminator = ["operation", "type", "mode", "action"]
    .map((field) => ({ field, value: args[field] }))
    .find((candidate) => typeof candidate.value === "string");
  const branch = discriminator
    ? { field: discriminator.field, value: discriminator.value as string }
    : undefined;
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
  return GRAPH;
}
