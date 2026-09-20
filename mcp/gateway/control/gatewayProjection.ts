import type { ControlPacket } from "./packet";
import {
  DEFAULT_CONTROL_HEADROOM_POLICY,
  normalizeControlHeadroomPolicy,
  projectControlStageContextWithHeadroom,
  serializedUtf8Bytes,
  type ControlEnvelopeHeadroomDiagnostics,
  type ControlHeadroomPolicy,
} from "./contextHeadroom";

/**
 * AI-client status projection. Sibling Gateway status already owns project
 * affinity, authoring phase and Runtime health; do not repeat those facts.
 */
export function projectControlPacketForGatewayWithDiagnostics(
  packet: ControlPacket,
  policy: Partial<ControlHeadroomPolicy> = DEFAULT_CONTROL_HEADROOM_POLICY
): {
  packet: ReturnType<typeof buildGatewayPacketWithoutStage> & {
    stage_context?: ReturnType<
      typeof projectControlStageContextWithHeadroom
    >["context"];
  };
  diagnostics: ControlEnvelopeHeadroomDiagnostics;
} {
  const normalizedPolicy = normalizeControlHeadroomPolicy(policy);
  const base = buildGatewayPacketWithoutStage(packet);
  const fixedEnvelopeBytes = serializedUtf8Bytes(base);
  const stageAllowanceBytes = Math.max(
    1,
    normalizedPolicy.envelope_bytes -
      normalizedPolicy.continuation_reserve_bytes -
      fixedEnvelopeBytes
  );
  const stage = packet.stage_context
    ? projectControlStageContextWithHeadroom(
        packet.stage_context,
        stageAllowanceBytes
      )
    : null;
  const projected = {
    ...base,
    ...(stage ? { stage_context: stage.context } : {}),
  };
  const finalEnvelopeBytes = serializedUtf8Bytes(projected);

  return {
    packet: projected,
    diagnostics: {
      envelope_budget_bytes: normalizedPolicy.envelope_bytes,
      continuation_reserve_bytes:
        normalizedPolicy.continuation_reserve_bytes,
      fixed_envelope_bytes: fixedEnvelopeBytes,
      stage_allowance_bytes: stageAllowanceBytes,
      final_envelope_bytes: finalEnvelopeBytes,
      envelope_over_budget:
        finalEnvelopeBytes + normalizedPolicy.continuation_reserve_bytes >
        normalizedPolicy.envelope_bytes,
      stage: stage?.diagnostics ?? null,
    },
  };
}

function buildGatewayPacketWithoutStage(packet: ControlPacket) {
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
    system: packet.system,
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
    ...(packet.development !== null
      ? { development: packet.development }
      : {}),
    context,
    ...(packet.blockers.length > 0
      ? { blockers: packet.blockers }
      : {}),
  };
}

export function projectControlPacketForGateway(packet: ControlPacket) {
  return projectControlPacketForGatewayWithDiagnostics(packet).packet;
}
