import {
  authoringDomainForCapability,
  sourceOwnerForCapability,
} from "../registry";
import type { ControlDelta } from "../types";
import type { BlockitAuthoringPhaseAffinity } from "../../runtime/projectAffinity";
import {
  authoritativeRevisionEvidence,
  mutationFreshness,
  mutationInvalidation,
} from "./freshness";
import {
  verificationClassForResult,
  verificationScopeForResult,
} from "./verification";
import { particleTextureHandoffRequired } from "./receipts";

export function buildControlDelta(input: {
  capability: string;
  phaseBefore: BlockitAuthoringPhaseAffinity | null;
  phaseAfter: BlockitAuthoringPhaseAffinity | null;
  projectUuid: string | null;
  succeeded: boolean;
  result?: unknown;
}): ControlDelta {
  const changed: string[] = [];
  if (input.succeeded && input.phaseBefore !== input.phaseAfter) changed.push("authoring_phase");
  if (input.capability === "create_project" && input.succeeded) changed.push("project_affinity");

  const authoringDomain = authoringDomainForCapability(input.capability);
  const invalidates = mutationInvalidation(input.capability, authoringDomain, input.succeeded, input.result);
  const freshness = mutationFreshness(
    input.capability,
    authoringDomain,
    input.succeeded,
    input.result
  );
  const revisionEvidence = input.succeeded
    ? authoritativeRevisionEvidence(input.capability, input.result)
    : {};
  const verificationClass = verificationClassForResult(
    input.capability,
    input.succeeded,
    freshness,
    input.result
  );
  const verificationScope = verificationScopeForResult(
    input.capability,
    verificationClass,
    input.result
  );
  const particleTextureHandoff =
    input.succeeded &&
    input.capability === "manage_particle" &&
    particleTextureHandoffRequired(input.result);
  const nextIntent = !input.succeeded
    ? "RECOVER_CURRENT_OPERATION"
    : particleTextureHandoff
      ? "AUTHOR_PARTICLE_TEXTURE_THEN_RESUME"
      : input.capability === "switch_authoring_phase"
        ? "CONTINUE_NEW_AUTHORING_PHASE"
        : authoringDomain === "GEOMETRY"
          ? "VERIFY_OR_CONTINUE_GEOMETRY"
          : authoringDomain === "TEXTURING"
            ? "VERIFY_OR_CONTINUE_TEXTURING"
            : authoringDomain === "ANIMATION"
              ? "VERIFY_OR_CONTINUE_ANIMATION"
              : "CONTINUE_CURRENT_TASK";

  return {
    protocol: "lazydesigner-control-v1",
    capability: input.capability,
    authoring_domain: authoringDomain,
    source_owner: sourceOwnerForCapability(input.capability),
    phase_before: input.phaseBefore,
    phase_after: input.phaseAfter,
    project_uuid: input.projectUuid,
    changed,
    invalidates,
    freshness,
    revision_evidence: revisionEvidence,
    next_intent: nextIntent,
    verification_class: verificationClass,
    verification_scope: verificationScope,
    requires_status_refresh: changed.length > 0,
  };
}
