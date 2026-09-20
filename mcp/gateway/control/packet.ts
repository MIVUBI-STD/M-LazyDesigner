import { createHash } from "node:crypto";
import type { GatewayRuntimeStatus } from "../backend";
import { resolveDevelopmentIntent, type ControlDevelopmentResolution } from "./developmentIntent";
import { contextForAuthoringDomain } from "./registry";
import { buildControlSnapshot } from "./snapshot";
import {
  buildControlStageContext,
  type ControlStageContext,
} from "./contextProjection";
import { readReferencePackageProjection, type ControlReferenceProjection } from "./referencePackage";
import { readWorkspaceProjection, type ControlWorkspaceProjection } from "./workspace";
import type {
  ControlAuthoringDomain,
  ControlContextHandle,
  ControlReadiness,
  ControlSnapshot,
} from "./types";

export type ControlTaskMode = "ASSET_AUTHORING" | "SYSTEM_DEVELOPMENT";

export type ControlContextDelivery = {
  required: ControlContextHandle[];
  optional: ControlContextHandle[];
  cached_ids: string[];
  invalidated_ids: string[];
};

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

export type ControlPacket = Omit<ControlSnapshot, "context" | "mode"> & {
  mode: ControlTaskMode;
  task_context_id: string;
  readiness: ControlReadiness;
  workspace: ControlWorkspaceSummary;
  reference: ControlReferenceSummary;
  stage_context: ControlStageContext | null;
  development: ControlDevelopmentResolution | null;
  context: ControlContextDelivery;
};

type LifecycleProjection = {
  ready: boolean;
  blocked: boolean;
  orientation_required: boolean;
  reasons: string[];
};

const NOT_REQUIRED_LIFECYCLE: LifecycleProjection = {
  ready: true,
  blocked: false,
  orientation_required: false,
  reasons: [],
};

function emptyWorkspace(): ControlWorkspaceProjection {
  return {
    available: false,
    source_path: null,
    fingerprint: null,
    asset: null,
    current_stage: null,
    gates: { geometry: null, uv_layout: null, texturing: null, animation: null },
    next_step: null,
    blockers: [],
    unavailable_reason: "PROJECT_PATH_UNAVAILABLE",
  };
}

function workspaceSummary(workspace: ControlWorkspaceProjection): ControlWorkspaceSummary {
  return {
    available: workspace.available,
    fingerprint: workspace.fingerprint,
    asset: workspace.asset,
    ...(workspace.unavailable_reason ? { unavailable_reason: workspace.unavailable_reason } : {}),
  };
}

function referenceSummary(reference: ControlReferenceProjection): ControlReferenceSummary {
  return {
    available: reference.available,
    fingerprint: reference.fingerprint,
    asset_name: reference.asset_name,
    asset_kind: reference.asset_kind,
    selected_profile: reference.selected_profile,
    particle: reference.particle,
    ...(reference.unavailable_reason ? { unavailable_reason: reference.unavailable_reason } : {}),
  };
}

function runtimeContextIdentity(snapshot: ControlSnapshot): string {
  return snapshot.runtime.build_identity ?? snapshot.runtime.runtime_signature ?? "offline";
}

function taskContextId(
  snapshot: ControlSnapshot,
  workspace: ControlWorkspaceProjection,
  reference: ControlReferenceProjection,
  mode: ControlTaskMode,
  development: ControlDevelopmentResolution | null,
  currentUserDelta: string | null
): string {
  const payload = mode === "SYSTEM_DEVELOPMENT"
    ? [
        mode,
        runtimeContextIdentity(snapshot),
        development?.domain ?? "no-development-domain",
        development?.intent ?? "no-development-intent",
      ]
    : [
        mode,
        snapshot.project.affinity_uuid ?? "unbound",
        snapshot.authoring.phase ?? "unknown",
        runtimeContextIdentity(snapshot),
        workspace.fingerprint ?? "no-workspace-state",
        reference.fingerprint ?? "no-reference-package",
        currentUserDelta ?? "no-user-delta",
      ];
  return `task:${createHash("sha256").update(payload.join("|")).digest("hex").slice(0, 20)}`;
}

function contextFamily(id: string): string {
  const at = id.lastIndexOf("@");
  return at > 0 ? id.slice(0, at) : id;
}

function filterContext(
  snapshot: ControlSnapshot,
  knownContextIds: readonly string[],
  mode: ControlTaskMode
): ControlContextDelivery {
  if (mode === "SYSTEM_DEVELOPMENT") {
    return { required: [], optional: [], cached_ids: [], invalidated_ids: [] };
  }

  const known = new Set(knownContextIds);
  const current = [...snapshot.context.required, ...snapshot.context.optional];
  const currentIds = new Set(current.map((handle) => handle.id));
  const currentFamilies = new Set(current.map((handle) => contextFamily(handle.id)));

  return {
    required: snapshot.context.required.filter((handle) => !known.has(handle.id)),
    optional: snapshot.context.optional.filter((handle) => !known.has(handle.id)),
    cached_ids: current.filter((handle) => known.has(handle.id)).map((handle) => handle.id),
    invalidated_ids: knownContextIds.filter(
      (id) => !currentIds.has(id) && currentFamilies.has(contextFamily(id))
    ),
  };
}

function normalizedGate(value: string | null): string | null {
  return value?.trim().toUpperCase() || null;
}

function lifecycleForDomain(
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

function buildReadiness(
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

export async function buildControlPacket(
  status: GatewayRuntimeStatus,
  options: {
    knownContextIds?: readonly string[];
    workspacePath?: string | null;
    referencePackagePath?: string | null;
    currentUserDelta?: string | null;
    taskMode?: ControlTaskMode;
    taskIntent?: string | null;
  } = {}
): Promise<ControlPacket> {
  const baseSnapshot = buildControlSnapshot(status);
  const mode = options.taskMode ?? "ASSET_AUTHORING";
  const development = mode === "SYSTEM_DEVELOPMENT"
    ? resolveDevelopmentIntent(options.taskIntent ?? "")
    : null;
  const workspace = mode === "ASSET_AUTHORING"
    ? await readWorkspaceProjection(status, options.workspacePath)
    : emptyWorkspace();
  const reference = mode === "ASSET_AUTHORING"
    ? await readReferencePackageProjection(options.referencePackagePath)
    : await readReferencePackageProjection(null);
  const resolvedContext = mode === "ASSET_AUTHORING"
    ? await contextForAuthoringDomain(baseSnapshot.authoring.domain, reference.selected_profile)
    : { required: [], optional: [] };
  const snapshot: ControlSnapshot = { ...baseSnapshot, context: resolvedContext };
  const stageContext = mode === "ASSET_AUTHORING"
    ? buildControlStageContext({
        domain: snapshot.authoring.domain,
        reference,
        workspace,
        currentUserDelta: options.currentUserDelta,
      })
    : null;
  const lifecycle = mode === "ASSET_AUTHORING"
    ? lifecycleForDomain(snapshot.authoring.domain, workspace)
    : NOT_REQUIRED_LIFECYCLE;
  const workspaceBlockers = mode === "ASSET_AUTHORING"
    ? workspace.blockers.map((_, index) => `WORKSPACE_BLOCKER_${index + 1}`)
    : [];
  const referenceBlockers = stageContext?.stage_readiness === "BLOCKED"
    ? ["REFERENCE_STAGE_BLOCKED"]
    : [];
  const lifecycleBlockers = lifecycle.blocked ? lifecycle.reasons : [];
  const blockers = [
    ...snapshot.blockers,
    ...workspaceBlockers,
    ...referenceBlockers,
    ...lifecycleBlockers.filter((reason) => !snapshot.blockers.includes(reason)),
  ];

  return {
    ...snapshot,
    mode,
    system: snapshot.system === "READY" && blockers.length > snapshot.blockers.length ? "DEGRADED" : snapshot.system,
    task_context_id: taskContextId(
      snapshot,
      workspace,
      reference,
      mode,
      development,
      options.currentUserDelta?.trim() || null
    ),
    readiness: buildReadiness(
      snapshot,
      workspace,
      reference,
      mode,
      lifecycle,
      stageContext?.stage_readiness ?? null
    ),
    workspace: workspaceSummary(workspace),
    reference: referenceSummary(reference),
    stage_context: stageContext,
    development,
    context: filterContext(snapshot, options.knownContextIds ?? [], mode),
    blockers,
  };
}


/**
 * AI-client status projection. The sibling Gateway status payload already owns
 * project affinity, authoring phase, runtime online/catalog state and build
 * identity. Keep those values in the internal Control packet, but do not send
 * the same orientation facts twice to the model.
 */
export function projectControlPacketForGateway(packet: ControlPacket) {
  const context = {
    ...(packet.context.required.length > 0
      ? { required: packet.context.required }
      : {}),
    ...(packet.context.optional.length > 0
      ? { optional: packet.context.optional }
      : {}),
    ...(packet.context.invalidated_ids.length > 0
      ? { invalidated_ids: packet.context.invalidated_ids }
      : {}),
  };

  return {
    protocol: packet.protocol,
    system: packet.system,
    mode: packet.mode,
    task_context_id: packet.task_context_id,
    project: {
      active_uuid: packet.project.active_uuid,
      open_project_count: packet.project.open_project_count,
      binding: packet.project.binding,
    },
    authoring: {
      domain: packet.authoring.domain,
      next_intent: packet.authoring.next_intent,
    },
    runtime: {
      runtime_signature: packet.runtime.runtime_signature,
    },
    readiness: packet.readiness,
    workspace: packet.workspace,
    reference: packet.reference,
    stage_context: packet.stage_context,
    development: packet.development,
    context,
    blockers: packet.blockers,
  };
}
