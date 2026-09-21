export type CapabilityBranchHint = {
  field: string;
  value: string;
};

export type CapabilityRoutingContext = {
  authoringPhase?: "geometry" | "texturing" | "animation" | null;
};

export type CapabilityEligibility = "READY" | "UNKNOWN" | "BLOCKED";

export type CapabilityFact =
  | "project_bound"
  | "geometry_available"
  | "uv_plan_available"
  | "uv_layout_current"
  | "texture_available"
  | "material_available"
  | "animation_available"
  | "particle_available"
  | "visual_evidence_current"
  | "texture_alignment_current";

export type CapabilityFactValue = true | false | "unknown";

export type CapabilityFactState = Partial<
  Record<CapabilityFact, CapabilityFactValue>
>;
