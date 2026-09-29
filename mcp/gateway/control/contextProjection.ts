import { createHash } from "node:crypto";
import { canonicalJson } from "../../lib/semantic/canonical";
import type { ControlAuthoringDomain } from "./types";
import type { ControlWorkspaceProjection } from "./workspace";
import type {
  ControlReferenceProjection,
  ControlReferenceSemanticFacts,
  ControlReferenceStage,
  ControlReferenceStructuredFact,
} from "./referencePackage";
import {
  semanticDerivedArtifactStamp,
  type SemanticDerivedArtifactStamp,
} from "../development/semanticArtifact";

export type ControlContextType =
  | "GEOMETRY_CONTEXT"
  | "TEXTURE_CONTEXT"
  | "ANIMATION_CONTEXT";

export type ControlStageSemanticFacts = {
  parts: ControlReferenceStructuredFact[];
  articulation: ControlReferenceStructuredFact[];
  materials: ControlReferenceStructuredFact[];
  animation_guidance: ControlReferenceStructuredFact[];
  constraints: string[];
};

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
  semantic_facts: ControlStageSemanticFacts;
  reference_document: string | null;
  reference_image_ids: string[];
  workspace: {
    asset: string | null;
    current_stage: string | null;
    gates: ControlWorkspaceProjection["gates"];
    next_step: string | null;
  };
};

const EMPTY_SEMANTIC_FACTS: ControlReferenceSemanticFacts = {
  parts: [],
  articulation: [],
  materials: [],
  animation_guidance: [],
  constraints: [],
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
) {
  if (!stage) return [];
  return reference.images.filter((image) => image.used_by.includes(stage));
}

function stringField(
  fact: ControlReferenceStructuredFact,
  key: string
): string | null {
  const value = fact[key];
  return typeof value === "string" ? value.trim().toUpperCase() : null;
}

function geometryParts(
  parts: readonly ControlReferenceStructuredFact[]
): ControlReferenceStructuredFact[] {
  return parts.filter((part) => {
    const role = stringField(part, "role");
    return role !== "TEXTURE" && role !== "ANIMATION_ONLY" && role !== "OMIT";
  });
}

function animationParts(
  parts: readonly ControlReferenceStructuredFact[]
): ControlReferenceStructuredFact[] {
  return parts.filter((part) => {
    const role = stringField(part, "role");
    const motion = stringField(part, "motion");
    return (
      role === "ANIMATION_ONLY" ||
      role === "EFFECT" ||
      motion === "ARTICULATED" ||
      motion === "FLEXIBLE"
    );
  });
}

export function semanticFactsForAuthoringDomain(
  domain: ControlAuthoringDomain | null,
  reference: ControlReferenceProjection
): ControlStageSemanticFacts {
  const facts = reference.semantic_facts ?? EMPTY_SEMANTIC_FACTS;

  if (domain === "GEOMETRY") {
    return {
      parts: geometryParts(facts.parts),
      articulation: facts.articulation,
      materials: [],
      animation_guidance: [],
      constraints: facts.constraints,
    };
  }

  if (domain === "TEXTURING") {
    return {
      parts: [],
      articulation: [],
      materials: facts.materials,
      animation_guidance: [],
      constraints: facts.constraints,
    };
  }

  if (domain === "ANIMATION") {
    return {
      parts: animationParts(facts.parts),
      articulation: facts.articulation,
      materials: [],
      animation_guidance: facts.animation_guidance,
      constraints: facts.constraints,
    };
  }

  return {
    parts: [],
    articulation: [],
    materials: [],
    animation_guidance: [],
    constraints: facts.constraints,
  };
}

export function stageReferenceSemanticFingerprint(
  domain: ControlAuthoringDomain | null,
  reference: ControlReferenceProjection
): string {
  const stage = referenceStage(domain);
  const images = imagesForStage(stage, reference);
  const payload = canonicalJson({
    asset_name: reference.asset_name,
    asset_kind: reference.asset_kind,
    intent: reference.intent,
    selected_profile: reference.selected_profile,
    requirements: reference.requirements,
    readiness: readinessForAuthoringDomain(domain, reference),
    blocking_unknowns:
      readinessForAuthoringDomain(domain, reference) === "BLOCKED"
        ? reference.blocking_unknowns
        : [],
    non_blocking_unknowns: reference.non_blocking_unknowns,
    document: stage ? reference.documents[stage] ?? null : null,
    images,
    semantic_facts: semanticFactsForAuthoringDomain(domain, reference),
  });
  return createHash("sha256").update(payload).digest("hex");
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
  const referenceImages = imagesForStage(stage, input.reference);
  const referenceImageIds = referenceImages.map((image) => image.id);
  const blockingUnknowns = stageReadiness === "BLOCKED"
    ? [...input.reference.blocking_unknowns]
    : [];
  const relevantNonBlocking = [...input.reference.non_blocking_unknowns];
  const semanticFacts = semanticFactsForAuthoringDomain(
    input.domain,
    input.reference
  );
  const stageReferenceFingerprint = stageReferenceSemanticFingerprint(
    input.domain,
    input.reference
  );

  const hashPayload = canonicalJson({
    type,
    delta: input.currentUserDelta?.trim() || null,
    stage_reference: stageReferenceFingerprint,
    workspace: input.workspace.fingerprint,
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
    semantic_facts: semanticFacts,
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
