import {
  readRuntimeAuthoringPhase,
  readRuntimeProjectHealth,
  type BlockitAuthoringPhaseAffinity,
} from "./projectAffinity";
import { GatewayBackendError } from "./backendContract";
import type { JsonRecord } from "../protocol";

export type AffinityResolution<T> = {
  value: T;
  changed: boolean;
};

export function resolveAuthoringPhaseAffinity(
  current: BlockitAuthoringPhaseAffinity | null,
  health: JsonRecord
): AffinityResolution<BlockitAuthoringPhaseAffinity> {
  const runtimePhase = readRuntimeAuthoringPhase(health);
  if (!runtimePhase) {
    throw new GatewayBackendError(
      "BACKEND_UNAVAILABLE",
      "The connected LazyDesigner Runtime does not expose a valid authoring phase. Deploy/reload the matching LazyDesigner build before authoring.",
      false
    );
  }

  if (!current) {
    return { value: runtimePhase, changed: true };
  }

  if (runtimePhase !== current) {
    throw new GatewayBackendError(
      "BACKEND_UNAVAILABLE",
      `LazyDesigner Runtime did not honor this Gateway's ${current} authoring phase affinity (reported ${runtimePhase}). Deploy/reload the matching LazyDesigner build before continuing.`,
      false,
      {
        requested_authoring_phase: current,
        runtime_authoring_phase: runtimePhase,
      }
    );
  }

  return { value: current, changed: false };
}

export function resolveProjectAffinity(
  current: string | null,
  health: JsonRecord,
  bindIfUnset: boolean,
  allowMissingBoundProject: boolean = false
): AffinityResolution<string | null> {
  const projectHealth = readRuntimeProjectHealth(health);
  if (!projectHealth) {
    if (bindIfUnset || current) {
      throw new GatewayBackendError(
        "PROJECT_CONTEXT_LOST",
        "The connected LazyDesigner Runtime does not expose project-affinity health. Deploy/reload the matching LazyDesigner build before authoring mutations.",
        false
      );
    }
    return { value: current, changed: false };
  }

  if (current) {
    if (
      projectHealth.requested_project_uuid !== current ||
      projectHealth.requested_project_available !== true
    ) {
      if (allowMissingBoundProject) {
        return { value: null, changed: true };
      }
      throw new GatewayBackendError(
        "PROJECT_CONTEXT_LOST",
        `Gateway-bound Blockbench project ${current} is no longer available. Select the intended open tab and explicitly rebind this Gateway before continuing.`,
        false,
        {
          project_uuid: current,
          active_project_uuid: projectHealth.active_project_uuid,
          action:
            "select intended Blockbench tab, then call status with adopt_active_project=true",
        }
      );
    }
    return { value: current, changed: false };
  }

  if (!bindIfUnset) {
    return { value: current, changed: false };
  }

  if (
    projectHealth.open_project_count !== 1 ||
    !projectHealth.active_project_uuid
  ) {
    const message =
      projectHealth.open_project_count > 1
        ? `LazyDesigner Gateway is not bound and ${projectHealth.open_project_count} Blockbench projects are open. Select the intended tab and explicitly bind this chat before authoring.`
        : "LazyDesigner Gateway is not bound and there is no single active Blockbench project to bind safely.";
    throw new GatewayBackendError(
      "PROJECT_CONTEXT_LOST",
      message,
      false,
      {
        active_project_uuid: projectHealth.active_project_uuid,
        open_project_count: projectHealth.open_project_count,
        action:
          "select intended Blockbench tab, then call status with adopt_active_project=true",
      }
    );
  }

  return {
    value: projectHealth.active_project_uuid,
    changed: true,
  };
}
