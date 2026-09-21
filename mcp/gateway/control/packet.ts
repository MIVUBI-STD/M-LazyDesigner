import type { GatewayRuntimeStatus } from "../backend";
import {
  resolveDevelopmentIntent,
  type ControlDevelopmentResolution,
} from "./developmentIntent";
import { contextForAuthoringDomain } from "./contexts";
import { buildControlSnapshot } from "./snapshot";
import {
  buildControlStageContext,
  type ControlStageContext,
} from "./contextProjection";
import {
  readReferencePackageProjection,
  type ControlReferenceProjection,
} from "./referencePackage";
import {
  readWorkspaceProjection,
  type ControlWorkspaceProjection,
} from "./workspace";
import type {
  ControlReadiness,
  ControlSnapshot,
} from "./types";
import {
  filterContext,
  taskContextId,
  type ControlContextDelivery,
  type ControlTaskMode,
} from "./packetContext";
import {
  buildReadiness,
  lifecycleForDomain,
  NOT_REQUIRED_LIFECYCLE,
} from "./readiness";
import {
  emptyWorkspace,
  referenceSummary,
  workspaceSummary,
  type ControlReferenceSummary,
  type ControlWorkspaceSummary,
} from "./packetData";

export type {
  ControlContextDelivery,
  ControlTaskMode,
} from "./packetContext";
export type {
  ControlReferenceSummary,
  ControlWorkspaceSummary,
} from "./packetData";

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
  const development =
    mode === "SYSTEM_DEVELOPMENT"
      ? resolveDevelopmentIntent(options.taskIntent ?? "")
      : null;

  const workspace =
    mode === "ASSET_AUTHORING"
      ? await readWorkspaceProjection(status, options.workspacePath)
      : emptyWorkspace();

  const reference =
    mode === "ASSET_AUTHORING"
      ? await readReferencePackageProjection(options.referencePackagePath)
      : await readReferencePackageProjection(null);

  const resolvedContext =
    mode === "ASSET_AUTHORING"
      ? await contextForAuthoringDomain(
          baseSnapshot.authoring.domain,
          reference.selected_profile
        )
      : { required: [], optional: [] };

  const snapshot: ControlSnapshot = {
    ...baseSnapshot,
    context: resolvedContext,
  };

  const stageContext =
    mode === "ASSET_AUTHORING"
      ? buildControlStageContext({
          domain: snapshot.authoring.domain,
          reference,
          workspace,
          currentUserDelta: options.currentUserDelta,
        })
      : null;

  const lifecycle =
    mode === "ASSET_AUTHORING"
      ? lifecycleForDomain(snapshot.authoring.domain, workspace)
      : NOT_REQUIRED_LIFECYCLE;

  const workspaceBlockers =
    mode === "ASSET_AUTHORING"
      ? workspace.blockers.map(
          (_, index) => `WORKSPACE_BLOCKER_${index + 1}`
        )
      : [];
  const referenceBlockers =
    stageContext?.stage_readiness === "BLOCKED"
      ? ["REFERENCE_STAGE_BLOCKED"]
      : [];
  const lifecycleBlockers = lifecycle.blocked
    ? lifecycle.reasons
    : [];
  const blockers = [
    ...snapshot.blockers,
    ...workspaceBlockers,
    ...referenceBlockers,
    ...lifecycleBlockers.filter(
      (reason) => !snapshot.blockers.includes(reason)
    ),
  ];

  return {
    ...snapshot,
    mode,
    system:
      snapshot.system === "READY" &&
      blockers.length > snapshot.blockers.length
        ? "DEGRADED"
        : snapshot.system,
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
    context: filterContext(
      snapshot,
      options.knownContextIds ?? [],
      mode
    ),
    blockers,
  };
}

export {
  projectControlPacketForGateway,
  projectControlPacketForGatewayWithDiagnostics,
} from "./gatewayProjection";
