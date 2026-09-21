import type { ControlReferenceProjection } from "./referenceTypes";
import type { ControlWorkspaceProjection } from "./workspace";

export type ControlWorkspaceSummary = Pick<
  ControlWorkspaceProjection,
  "available" | "fingerprint" | "asset" | "unavailable_reason"
>;

export type ControlReferenceSummary = Pick<
  ControlReferenceProjection,
  | "available"
  | "fingerprint"
  | "asset_name"
  | "asset_kind"
  | "selected_profile"
  | "particle"
  | "unavailable_reason"
>;

export function emptyWorkspace(): ControlWorkspaceProjection {
  return {
    available: false,
    source_path: null,
    fingerprint: null,
    asset: null,
    current_stage: null,
    gates: {
      geometry: null,
      uv_layout: null,
      texturing: null,
      animation: null,
    },
    next_step: null,
    blockers: [],
    unavailable_reason: "PROJECT_PATH_UNAVAILABLE",
  };
}

export function workspaceSummary(
  workspace: ControlWorkspaceProjection
): ControlWorkspaceSummary {
  return {
    available: workspace.available,
    fingerprint: workspace.fingerprint,
    asset: workspace.asset,
    ...(workspace.unavailable_reason
      ? { unavailable_reason: workspace.unavailable_reason }
      : {}),
  };
}

export function referenceSummary(
  reference: ControlReferenceProjection
): ControlReferenceSummary {
  return {
    available: reference.available,
    fingerprint: reference.fingerprint,
    asset_name: reference.asset_name,
    asset_kind: reference.asset_kind,
    selected_profile: reference.selected_profile,
    particle: reference.particle,
    ...(reference.unavailable_reason
      ? { unavailable_reason: reference.unavailable_reason }
      : {}),
  };
}
