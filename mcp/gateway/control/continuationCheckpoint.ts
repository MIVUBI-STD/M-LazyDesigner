import type { ControlPacket } from "./packet";
import type { ControlDelta } from "./types";
import { projectControlStageContextWithHeadroom } from "./contextHeadroom";

export const CONTINUATION_CHECKPOINT_STAGE_PROXY_BYTES = 3072;

export type ControlContinuationCheckpoint = {
  schema: "lazydesigner-continuation-v1";
  task_context_id: string;
  mode: ControlPacket["mode"];
  project: {
    active_uuid: string | null;
    binding: ControlPacket["project"]["binding"];
  };
  authoring: {
    domain: ControlPacket["authoring"]["domain"];
    next_intent: string;
  };
  readiness: {
    modelling_start: ControlPacket["readiness"]["modelling_start"];
    reasons: string[];
  };
  workspace: ControlPacket["workspace"];
  reference: ControlPacket["reference"];
  stage_context?: ReturnType<typeof projectControlStageContextWithHeadroom>["context"];
  context: {
    active_ids: string[];
    invalidated_ids: string[];
  };
  last_operation?: {
    authoring_domain: ControlDelta["authoring_domain"];
    project_uuid: string | null;
    changed?: string[];
    freshness: {
      basis: ControlDelta["freshness"]["basis"];
      stale: ControlDelta["freshness"]["stale"];
      unknown: ControlDelta["freshness"]["unknown"];
    };
    revision_evidence?: ControlDelta["revision_evidence"];
    next_intent: string;
    verification_class: ControlDelta["verification_class"];
    verification_scope: ControlDelta["verification_scope"];
    requires_status_refresh: boolean;
  };
  blockers?: string[];
};

/**
 * Minimal deterministic state for an upstream conversation-compaction owner.
 * It is not chat history, not a persistent state database, and is not emitted
 * on normal Gateway status/invoke responses.
 */
export function buildControlContinuationCheckpoint(
  packet: ControlPacket,
  delta?: ControlDelta | null
): ControlContinuationCheckpoint {
  const stage = packet.stage_context
    ? projectControlStageContextWithHeadroom(
        packet.stage_context,
        CONTINUATION_CHECKPOINT_STAGE_PROXY_BYTES
      ).context
    : null;

  return {
    schema: "lazydesigner-continuation-v1",
    task_context_id: packet.task_context_id,
    mode: packet.mode,
    project: {
      active_uuid: packet.project.active_uuid,
      binding: packet.project.binding,
    },
    authoring: {
      domain: packet.authoring.domain,
      next_intent: delta?.next_intent ?? packet.authoring.next_intent,
    },
    readiness: {
      modelling_start: packet.readiness.modelling_start,
      reasons: [...packet.readiness.reasons],
    },
    workspace: packet.workspace,
    reference: packet.reference,
    ...(stage ? { stage_context: stage } : {}),
    context: {
      // A checkpoint may be created after unchanged handles were omitted from a
      // status response via known_context_ids. Preserve both newly-required and
      // already-cached current identities so upstream compaction cannot forget
      // which specialist/profile context is still authoritative.
      active_ids: [
        ...new Set([
          ...packet.context.required.map((handle) => handle.id),
          ...packet.context.optional.map((handle) => handle.id),
          ...packet.context.cached_ids,
        ]),
      ],
      invalidated_ids: [...packet.context.invalidated_ids],
    },
    ...(delta
      ? {
          last_operation: {
            authoring_domain: delta.authoring_domain,
            project_uuid: delta.project_uuid,
            ...(delta.changed.length > 0 ? { changed: [...delta.changed] } : {}),
            freshness: {
              basis: delta.freshness.basis,
              stale: [...delta.freshness.stale],
              unknown: [...delta.freshness.unknown],
            },
            ...(Object.keys(delta.revision_evidence).length > 0
              ? { revision_evidence: { ...delta.revision_evidence } }
              : {}),
            next_intent: delta.next_intent,
            verification_class: delta.verification_class,
            verification_scope: delta.verification_scope,
            requires_status_refresh: delta.requires_status_refresh,
          },
        }
      : {}),
    ...(packet.blockers.length > 0 ? { blockers: [...packet.blockers] } : {}),
  };
}
