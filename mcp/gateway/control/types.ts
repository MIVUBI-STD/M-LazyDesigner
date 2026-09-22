import type { CapabilitySummary, JsonRecord } from "../protocol";
import type { CapabilityVerificationClass } from "../../lib/capabilityMetadata";
import type { BlockitAuthoringPhaseAffinity } from "../runtime/projectAffinity";
import type { SemanticRevisionDimension } from "../capabilities/semanticRegistry";

export type ControlAuthoringDomain = "GEOMETRY" | "TEXTURING" | "ANIMATION" | "CORE";

export type ControlFreshnessScope =
  | "GEOMETRY_STRUCTURE"
  | "UV_MAPPING"
  | "TEXTURE_APPEARANCE"
  | "MATERIAL_RENDER"
  | "ANIMATION_MOTION"
  | "ANIMATION_CONTROLLER"
  | "ANIMATION_EFFECTS"
  | "PARTICLE_SYSTEM";

export type ControlVerificationScope =
  | {
      kind: "CUBE_TARGETS";
      cube_uuids: string[];
      framing: {
        min: [number, number, number];
        max: [number, number, number];
      };
    }
  | {
      kind: "ANIMATION_RANGE";
      animation_uuid: string;
      bone_uuid: string;
      channel: string | null;
      time_range: [number, number];
      review: {
        bone_ids: string[];
        range: { start: number; end: number };
        sample_times: number[];
      };
    }
  | {
      kind: "TEXTURE_REGION";
      texture_uuid: string;
      affected_rect: [number, number, number, number];
      revision: string;
      evidence_source: "mutation_response" | "follow_up_read";
    };

export type ControlContextSemanticDependency = SemanticRevisionDimension;

export type ControlContextHandle = {
  id: string;
  path: string;
  sha256: string;
  semantic_dependencies: ControlContextSemanticDependency[];
  semantic_revision: string;
};

export type ControlSourceOwner = {
  source: string;
  specialist: string | null;
  test_owner: string | null;
};

export type ControlSystemState = "READY" | "DEGRADED" | "OFFLINE";

export type ControlReadiness = {
  modelling_start: "READY" | "NEEDS_ORIENTATION" | "BLOCKED";
  runtime_ready: boolean;
  project_ready: boolean;
  domain_ready: boolean;
  context_ready: boolean;
  workspace_state: "AVAILABLE" | "UNAVAILABLE" | "NOT_REQUIRED";
  reasons: string[];
};

export type ControlSnapshot = {
  protocol: "lazydesigner-control-v1";
  system: ControlSystemState;
  mode: "ASSET_AUTHORING";
  project: {
    affinity_uuid: string | null;
    active_uuid: string | null;
    open_project_count: number | null;
    binding: "BOUND" | "UNBOUND" | "LOST" | "UNKNOWN";
  };
  authoring: {
    phase: BlockitAuthoringPhaseAffinity | null;
    domain: ControlAuthoringDomain | null;
    next_intent: string;
  };
  runtime: {
    online: boolean;
    build_identity: string | null;
    runtime_signature: string | null;
    catalog_count: number;
    catalog_stale: boolean;
  };
  context: {
    required: ControlContextHandle[];
    optional: ControlContextHandle[];
  };
  blockers: string[];
};

export type ControlCapabilitySummary = CapabilitySummary & {
  control: {
    authoring_domain: ControlAuthoringDomain;
    current_domain: boolean;
    eligibility: "RECOMMENDED" | "AVAILABLE" | "FOREIGN_PHASE";
    source_owner: ControlSourceOwner;
  };
};

export type ControlDelta = {
  protocol: "lazydesigner-control-v1";
  capability: string;
  authoring_domain: ControlAuthoringDomain;
  source_owner: ControlSourceOwner;
  phase_before: BlockitAuthoringPhaseAffinity | null;
  phase_after: BlockitAuthoringPhaseAffinity | null;
  project_uuid: string | null;
  changed: string[];
  invalidates: {
    authoring_domains: ControlAuthoringDomain[];
    workspace_projection: boolean;
    acceptance_gates: boolean;
  };
  freshness: {
    basis: "NO_CHANGE" | "PRECISE_EFFECT" | "CONSERVATIVE_EFFECT" | "UNKNOWN_OUTCOME";
    stale: ControlFreshnessScope[];
    fresh: ControlFreshnessScope[];
    unknown: ControlFreshnessScope[];
  };
  revision_evidence: Partial<Record<ControlFreshnessScope, string>>;
  next_intent: string;
  verification_class: CapabilityVerificationClass;
  verification_scope: ControlVerificationScope | null;
  requires_status_refresh: boolean;
};

export type RuntimeHealthLike = JsonRecord & {
  build_identity?: unknown;
  exposed_tool_count?: unknown;
  product?: unknown;
  project_context?: unknown;
};
