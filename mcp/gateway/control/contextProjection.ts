import { createHash } from "node:crypto";
import { canonicalJson } from "../../lib/semantic/canonical";
import type { ControlAuthoringDomain } from "./types";
import type { ControlWorkspaceProjection } from "./workspace";
import type { ControlReferenceProjection, ControlReferenceStage } from "./referencePackage";
import { semanticDerivedArtifactStamp, type SemanticDerivedArtifactStamp } from "../development/semanticArtifact";

export type ControlContextType =
  | "GEOMETRY_CONTEXT"
  | "TEXTURE_CONTEXT"
  | "ANIMATION_CONTEXT";

export type ControlStageContext = {
  context_type: ControlContextType | null;
  context_hash: string;
  semantic: SemanticDerivedArtifactStamp;
  original_user_intent: string | null;
  current_user_delta: string | null;
  selected_profile: string | null;
  reference_package_id_or_hash: string | null;
  workspace_revision_or_hash: string | null;
  stage_readiness: string | null;
  blocking_unknowns: string[];
  non_blocking_unknowns_relevant_to_stage: string[];
  requirements: ControlReferenceProjection["requirements"];
  reference_document: string | null;
  reference_image_ids: string[];
  workspace: {
    asset: string | null;
    current_stage: string | null;
    gates: ControlWorkspaceProjection["gates"];
    next_step: string | null;
  };
};

function contextType(domain: ControlAuthoringDomain | null): ControlContextType | null {
  if (domain === "GEOMETRY") return "GEOMETRY_CONTEXT";
  if (domain === "TEXTURING") return "TEXTURE_CONTEXT";
  if (domain === "ANIMATION") return "ANIMATION_CONTEXT";
  return null;
}

function referenceStage(domain: ControlAuthoringDomain | null): ControlReferenceStage | null {
  if (domain === "GEOMETRY") return "GEOMETRY";
  if (domain === "TEXTURING") return "TEXTURE";
  if (domain === "ANIMATION") return "ANIMATION";
  return null;
}

export function readinessForAuthoringDomain(
  domain: ControlAuthoringDomain | null,
  reference: ControlReferenceProjection
): string | null {
  if (domain === "GEOMETRY") return reference.readiness.geometry;
  if (domain === "TEXTURING") return reference.readiness.texture;
  if (domain === "ANIMATION") return reference.readiness.animation;
  return reference.readiness.overall;
}

function imagesForStage(
  stage: ControlReferenceStage | null,
  reference: ControlReferenceProjection
): string[] {
  if (!stage) return [];
  return reference.images
    .filter((image) => image.used_by.includes(stage))
    .map((image) => image.id);
}

export function buildControlStageContext(input: {
  domain: ControlAuthoringDomain | null;
  reference: ControlReferenceProjection;
  workspace: ControlWorkspaceProjection;
  currentUserDelta?: string | null;
}): ControlStageContext {
  const stage = referenceStage(input.domain);
  const type = contextType(input.domain);
  const stageReadiness = readinessForAuthoringDomain(input.domain, input.reference);
  const referenceDocument = stage ? input.reference.documents[stage] ?? null : null;
  const referenceImageIds = imagesForStage(stage, input.reference);
  const blockingUnknowns = stageReadiness === "BLOCKED"
    ? [...input.reference.blocking_unknowns]
    : [];
  const relevantNonBlocking = [...input.reference.non_blocking_unknowns];

  const hashPayload = canonicalJson({
    type,
    intent: input.reference.intent,
    delta: input.currentUserDelta ?? null,
    profile: input.reference.selected_profile,
    reference: input.reference.fingerprint,
    workspace: input.workspace.fingerprint,
    readiness: stageReadiness,
    blockingUnknowns,
    referenceDocument,
    referenceImageIds,
  });

  return {
    context_type: type,
    context_hash: createHash("sha256").update(hashPayload).digest("hex"),
    semantic: semanticDerivedArtifactStamp("AI_STAGE_CONTEXT"),
    original_user_intent: input.reference.intent,
    current_user_delta: input.currentUserDelta?.trim() || null,
    selected_profile: input.reference.selected_profile,
    reference_package_id_or_hash: input.reference.fingerprint,
    workspace_revision_or_hash: input.workspace.fingerprint,
    stage_readiness: stageReadiness,
    blocking_unknowns: blockingUnknowns,
    non_blocking_unknowns_relevant_to_stage: relevantNonBlocking,
    requirements: input.reference.requirements,
    reference_document: referenceDocument,
    reference_image_ids: referenceImageIds,
    workspace: {
      asset: input.workspace.asset,
      current_stage: input.workspace.current_stage,
      gates: input.workspace.gates,
      next_step: input.workspace.next_step,
    },
  };
}
