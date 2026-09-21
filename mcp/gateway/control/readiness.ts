import type { ControlReferenceProjection } from "./referenceTypes";
import type { ControlWorkspaceProjection } from "./workspace";
import type {
  ControlAuthoringDomain,
  ControlReadiness,
  ControlSnapshot,
} from "./types";
import type { ControlTaskMode } from "./packetContext";

export type LifecycleProjection = {
  ready: boolean;
  blocked: boolean;
  orientation_required: boolean;
  reasons: string[];
};

export const NOT_REQUIRED_LIFECYCLE: LifecycleProjection = {
  ready: true,
  blocked: false,
  orientation_required: false,
  reasons: [],
};

function normalizedGate(value: string | null): string | null {
  return value?.trim().toUpperCase() || null;
}

export function lifecycleForDomain(
  domain: ControlAuthoringDomain | null,
  workspace: ControlWorkspaceProjection
): LifecycleProjection {
  if (!domain || domain === "CORE") {
    return { ready: false, blocked: false, orientation_required: true, reasons: ["AUTHORING_DOMAIN_UNRESOLVED"] };
  }

  if (domain === "GEOMETRY") {
    return { ready: true, blocked: false, orientation_required: false, reasons: [] };
  }

  if (!workspace.available) {
    return {
      ready: false,
      blocked: false,
      orientation_required: true,
      reasons: ["WORKSPACE_LIFECYCLE_UNAVAILABLE"],
    };
  }

  const geometry = normalizedGate(workspace.gates.geometry);
  const uv = normalizedGate(workspace.gates.uv_layout);
  const texturing = normalizedGate(workspace.gates.texturing);
  const reasons: string[] = [];

  if (geometry !== "APPROVED") reasons.push("GEOMETRY_APPROVAL_REQUIRED");
  if (uv !== "PASS") reasons.push("UV_LAYOUT_PASS_REQUIRED");
  if (domain === "ANIMATION" && texturing !== "APPROVED") {
    reasons.push("TEXTURE_APPROVAL_REQUIRED");
  }

  return {
    ready: reasons.length === 0,
    blocked: reasons.length > 0,
    orientation_required: false,
    reasons,
  };
}

export function buildReadiness(
  snapshot: ControlSnapshot,
  workspace: ControlWorkspaceProjection,
  reference: ControlReferenceProjection,
  mode: ControlTaskMode,
  lifecycle: LifecycleProjection,
  activeReferenceReadiness: string | null
): ControlReadiness {
  if (mode === "SYSTEM_DEVELOPMENT") {
    return {
      modelling_start: "NEEDS_ORIENTATION",
      runtime_ready: snapshot.runtime.online && !snapshot.runtime.catalog_stale,
      project_ready: false,
      domain_ready: false,
      context_ready: true,
      workspace_state: "NOT_REQUIRED",
      reasons: ["SYSTEM_DEVELOPMENT_MODE"],
    };
  }

  const runtimeReady = snapshot.runtime.online && !snapshot.runtime.catalog_stale;
  const projectReady = snapshot.project.binding === "BOUND";
  const domainReady = snapshot.authoring.domain !== null;
  const contextReady = snapshot.context.required.length > 0;
  const activeReferenceBlocked = activeReferenceReadiness === "BLOCKED";
  const reasons: string[] = [];

  if (!snapshot.runtime.online) reasons.push("RUNTIME_OFFLINE");
  if (snapshot.runtime.catalog_stale) reasons.push("CATALOG_STALE");
  if (!projectReady) reasons.push("PROJECT_NOT_BOUND");
  if (!domainReady) reasons.push("AUTHORING_DOMAIN_UNRESOLVED");
  if (!contextReady) reasons.push("REQUIRED_CONTEXT_UNRESOLVED");
  if (!reference.available) reasons.push("REFERENCE_PACKAGE_UNAVAILABLE");
  if (activeReferenceBlocked) reasons.push("REFERENCE_STAGE_BLOCKED");
  reasons.push(...lifecycle.reasons.filter((reason) => !reasons.includes(reason)));

  const blocked =
    !runtimeReady ||
    snapshot.project.binding === "LOST" ||
    activeReferenceBlocked ||
    lifecycle.blocked;

  return {
    modelling_start: blocked
      ? "BLOCKED"
      : projectReady && domainReady && contextReady && !lifecycle.orientation_required
        ? "READY"
        : "NEEDS_ORIENTATION",
    runtime_ready: runtimeReady,
    project_ready: projectReady,
    domain_ready: domainReady,
    context_ready: contextReady,
    workspace_state: workspace.available ? "AVAILABLE" : "UNAVAILABLE",
    reasons,
  };
}


