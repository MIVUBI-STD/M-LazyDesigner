import type {
  ControlAuthoringDomain,
  ControlDelta,
  ControlFreshnessScope,
  ControlVerificationScope,
} from "./types";

export type ControlNextActionKind =
  | "CONTINUE"
  | "STATUS"
  | "RECOVER"
  | "HANDOFF"
  | "VERIFY_FOCUSED"
  | "VERIFY_VISUAL"
  | "REVIEW_RETURNED_EVIDENCE";

export type ControlNextAction = {
  kind: ControlNextActionKind;
  reason: string;
  recommended_capability: string | null;
  target_domain: ControlAuthoringDomain | null;
  verification_scope: ControlVerificationScope | null;
};

export type ControlContinuation = {
  protocol: "lazydesigner-continuation-action-v1";
  state_revision: number;
  project_uuid: string | null;
  owner: ControlAuthoringDomain;
  next_action: ControlNextAction;
  context: {
    preserve_current: boolean;
    reorient_required: boolean;
  };
  freshness: {
    basis: ControlDelta["freshness"]["basis"];
    stale: ControlFreshnessScope[];
    unknown: ControlFreshnessScope[];
  };
};

export type ControlExecutionState = {
  protocol: "lazydesigner-execution-v1";
  revision: number;
  project_uuid: string | null;
  phase: ControlDelta["phase_after"];
  owner: ControlAuthoringDomain;
  last_capability: string;
  last_freshness: ControlDelta["freshness"];
  pending_action: ControlNextAction;
};

function visualRecommendedCapability(
  scope: ControlVerificationScope | null
): string | null {
  if (!scope) return null;
  if (scope.kind === "CUBE_TARGETS") return "capture_model_views";
  if (scope.kind === "TEXTURE_REGION") {
    return scope.evidence_source === "follow_up_read" ? "get_texture" : null;
  }
  return null;
}

export function nextActionForControlDelta(delta: ControlDelta): ControlNextAction {
  if (delta.freshness.basis === "UNKNOWN_OUTCOME") {
    return {
      kind: "RECOVER",
      reason: "mutation outcome is uncertain; do not auto-retry",
      recommended_capability: null,
      target_domain: delta.authoring_domain,
      verification_scope: delta.verification_scope,
    };
  }

  if (delta.requires_status_refresh) {
    return {
      kind: "STATUS",
      reason: "project or authoring authority changed",
      recommended_capability: "status",
      target_domain: delta.authoring_domain,
      verification_scope: null,
    };
  }

  if (delta.next_intent === "AUTHOR_PARTICLE_TEXTURE_THEN_RESUME") {
    return {
      kind: "HANDOFF",
      reason: "particle texture dependency requires Texturing before Animation resumes",
      recommended_capability: null,
      target_domain: "TEXTURING",
      verification_scope: null,
    };
  }

  if (delta.verification_class === "focused_read") {
    return {
      kind: "VERIFY_FOCUSED",
      reason: "mutation receipt is insufficient for the affected state",
      recommended_capability: null,
      target_domain: delta.authoring_domain,
      verification_scope: delta.verification_scope,
    };
  }

  if (delta.verification_class === "visual") {
    if (
      delta.verification_scope?.kind === "TEXTURE_REGION" &&
      delta.verification_scope.evidence_source === "mutation_response"
    ) {
      return {
        kind: "REVIEW_RETURNED_EVIDENCE",
        reason: "decision-changing visual evidence is already present in the mutation receipt",
        recommended_capability: null,
        target_domain: delta.authoring_domain,
        verification_scope: delta.verification_scope,
      };
    }

    return {
      kind: "VERIFY_VISUAL",
      reason: "decision-changing visual evidence is required",
      recommended_capability: visualRecommendedCapability(delta.verification_scope),
      target_domain: delta.authoring_domain,
      verification_scope: delta.verification_scope,
    };
  }

  return {
    kind: "CONTINUE",
    reason:
      delta.verification_class === "receipt_only"
        ? "authoritative receipt is sufficient"
        : "no additional verification is required",
    recommended_capability: null,
    target_domain: delta.authoring_domain,
    verification_scope: null,
  };
}

/**
 * Ephemeral deterministic reducer for the Gateway process.
 *
 * It intentionally stores only the latest execution decision. Durable asset
 * truth stays in Workspace/Runtime and conversation history stays client-owned.
 */
export function reduceControlExecutionState(
  previous: ControlExecutionState | null,
  delta: ControlDelta
): {
  state: ControlExecutionState;
  continuation: ControlContinuation;
} {
  const sameProject =
    previous !== null &&
    previous.project_uuid !== null &&
    previous.project_uuid === delta.project_uuid;
  const revision = sameProject ? previous.revision + 1 : 1;
  const pendingAction = nextActionForControlDelta(delta);

  const state: ControlExecutionState = {
    protocol: "lazydesigner-execution-v1",
    revision,
    project_uuid: delta.project_uuid,
    phase: delta.phase_after,
    owner: delta.authoring_domain,
    last_capability: delta.capability,
    last_freshness: delta.freshness,
    pending_action: pendingAction,
  };

  return {
    state,
    continuation: {
      protocol: "lazydesigner-continuation-action-v1",
      state_revision: revision,
      project_uuid: delta.project_uuid,
      owner: delta.authoring_domain,
      next_action: pendingAction,
      context: {
        preserve_current: !delta.requires_status_refresh,
        reorient_required: delta.requires_status_refresh,
      },
      freshness: {
        basis: delta.freshness.basis,
        stale: [...delta.freshness.stale],
        unknown: [...delta.freshness.unknown],
      },
    },
  };
}
