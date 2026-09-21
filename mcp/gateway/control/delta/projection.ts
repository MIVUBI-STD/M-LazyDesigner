import type { ControlDelta } from "../types";

/**
 * Projects the rich internal Control delta into the minimum continuation state
 * required by an AI client. Internal Control keeps the complete delta for tests,
 * diagnostics and policy decisions; the Gateway drops only values that are
 * static, already known from the tool call, or deterministically derivable.
 *
 * Freshness contract:
 * - NO_CHANGE means every scope remains fresh.
 * - PRECISE_EFFECT / CONSERVATIVE_EFFECT list stale scopes; unlisted scopes remain fresh.
 * - UNKNOWN_OUTCOME keeps the complete unknown scope list and never implies freshness.
 */
export function projectControlDeltaForGateway(delta: ControlDelta) {
  const phaseChanged = delta.phase_before !== delta.phase_after;
  const freshness =
    delta.freshness.basis === "NO_CHANGE"
      ? { basis: delta.freshness.basis }
      : delta.freshness.basis === "UNKNOWN_OUTCOME"
        ? {
            basis: delta.freshness.basis,
            unknown: delta.freshness.unknown,
          }
        : {
            basis: delta.freshness.basis,
            stale: delta.freshness.stale,
          };

  return {
    authoring_domain: delta.authoring_domain,
    project_uuid: delta.project_uuid,
    ...(delta.changed.length > 0 ? { changed: delta.changed } : {}),
    ...(phaseChanged
      ? {
          phase_before: delta.phase_before,
          phase_after: delta.phase_after,
        }
      : {}),
    invalidates: delta.invalidates,
    freshness,
    ...(Object.keys(delta.revision_evidence).length > 0
      ? { revision_evidence: delta.revision_evidence }
      : {}),
    next_intent: delta.next_intent,
    verification_class: delta.verification_class,
    ...(delta.verification_scope !== null
      ? { verification_scope: delta.verification_scope }
      : {}),
    requires_status_refresh: delta.requires_status_refresh,
  };
}
