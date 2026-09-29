export type AssetHealthDomain =
  | "GEOMETRY"
  | "TEXTURING"
  | "ANIMATION"
  | "CORE";

export type AssetHealthStageState =
  | "PASS"
  | "REVIEW"
  | "BLOCKED"
  | "UNVERIFIED"
  | "NOT_REQUIRED";

export type AssetHealthSummary = {
  overall: "READY" | "REVIEW" | "BLOCKED" | "INCOMPLETE";
  active_domain: AssetHealthDomain | null;
  stages: {
    reference: AssetHealthStageState;
    geometry: AssetHealthStageState;
    uv_layout: AssetHealthStageState;
    texturing: AssetHealthStageState;
    animation: AssetHealthStageState;
  };
  blockers: string[];
  note: string;
};

export type AssetHealthReferenceLike = {
  available: boolean;
  requirements: {
    animation_required: boolean | null;
  };
  readiness: {
    overall: string | null;
    geometry: string | null;
    texture: string | null;
    animation: string | null;
  };
};

export type AssetHealthWorkspaceLike = {
  available: boolean;
  gates: {
    geometry: string | null;
    uv_layout: string | null;
    texturing: string | null;
    animation: string | null;
  };
  blockers: string[];
};

function normalized(value: string | null | undefined): string {
  return value?.trim().toUpperCase() ?? "";
}

function workspaceGateState(
  value: string | null | undefined,
  passValues: readonly string[]
): AssetHealthStageState {
  const gate = normalized(value);
  if (!gate || gate === "NOT_STARTED") return "UNVERIFIED";
  if (passValues.includes(gate)) return "PASS";
  if (gate === "BLOCKED" || gate === "FAILED" || gate === "FAIL") {
    return "BLOCKED";
  }
  return "REVIEW";
}

function referenceReadinessForDomain(
  domain: AssetHealthDomain | null,
  reference: AssetHealthReferenceLike
): string | null {
  if (domain === "GEOMETRY") return reference.readiness.geometry;
  if (domain === "TEXTURING") return reference.readiness.texture;
  if (domain === "ANIMATION") return reference.readiness.animation;
  return reference.readiness.overall;
}

function referenceState(
  domain: AssetHealthDomain | null,
  reference: AssetHealthReferenceLike
): AssetHealthStageState {
  if (!reference.available) return "UNVERIFIED";
  const value = normalized(referenceReadinessForDomain(domain, reference));
  if (value === "BLOCKED") return "BLOCKED";
  if (value === "READY" || value === "PASS") return "PASS";
  return value ? "REVIEW" : "UNVERIFIED";
}

/**
 * Pure lifecycle summary. It intentionally depends only on structural inputs so
 * the shared lib layer never imports Gateway/Control ownership.
 */
export function buildAssetHealthSummary(input: {
  domain: AssetHealthDomain | null;
  reference: AssetHealthReferenceLike;
  workspace: AssetHealthWorkspaceLike;
}): AssetHealthSummary {
  const animationRequired =
    input.reference.requirements.animation_required === true;
  const stages: AssetHealthSummary["stages"] = {
    reference: referenceState(input.domain, input.reference),
    geometry: input.workspace.available
      ? workspaceGateState(input.workspace.gates.geometry, ["APPROVED", "PASS"])
      : "UNVERIFIED",
    uv_layout: input.workspace.available
      ? workspaceGateState(input.workspace.gates.uv_layout, ["PASS", "APPROVED"])
      : "UNVERIFIED",
    texturing: input.workspace.available
      ? workspaceGateState(input.workspace.gates.texturing, ["APPROVED", "PASS"])
      : "UNVERIFIED",
    animation: !animationRequired
      ? "NOT_REQUIRED"
      : input.workspace.available
        ? workspaceGateState(input.workspace.gates.animation, ["APPROVED", "PASS"])
        : "UNVERIFIED",
  };

  const blockers: string[] = [];
  if (stages.reference === "BLOCKED") blockers.push("REFERENCE_STAGE_BLOCKED");
  if (stages.geometry === "BLOCKED") blockers.push("GEOMETRY_BLOCKED");
  if (stages.uv_layout === "BLOCKED") blockers.push("UV_LAYOUT_BLOCKED");
  if (stages.texturing === "BLOCKED") blockers.push("TEXTURING_BLOCKED");
  if (stages.animation === "BLOCKED") blockers.push("ANIMATION_BLOCKED");
  blockers.push(
    ...input.workspace.blockers.filter((entry) => !blockers.includes(entry))
  );

  const requiredStates = [
    stages.reference,
    stages.geometry,
    stages.uv_layout,
    stages.texturing,
    ...(animationRequired ? [stages.animation] : []),
  ];

  const overall: AssetHealthSummary["overall"] =
    blockers.length > 0 || requiredStates.includes("BLOCKED")
      ? "BLOCKED"
      : requiredStates.every((state) => state === "PASS")
        ? "READY"
        : requiredStates.some((state) => state === "REVIEW")
          ? "REVIEW"
          : "INCOMPLETE";

  return {
    overall,
    active_domain: input.domain,
    stages,
    blockers,
    note:
      "Lifecycle/gate summary only. PASS reflects existing authoritative workspace/reference gates; it never invents visual PASS, user approval, rig quality, export acceptance, or runtime proof.",
  };
}
