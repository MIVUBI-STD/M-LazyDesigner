import type { ShadowReplayCase, ShadowReplayKnowledgeState } from "../gateway/experimental/shadowRouting";

export type ReplayKnowledgeState = ShadowReplayKnowledgeState;

export type GatewayReplayCase = ShadowReplayCase & {
  domain:
    | "GEOMETRY"
    | "TEXTURING"
    | "ANIMATION"
    | "PARTICLE"
    | "MIXED"
    | "RECOVERY";
};

export const GATEWAY_REPLAY_CORPUS: readonly GatewayReplayCase[] = [
  {
    id: "geometry-update-unknown",
    domain: "GEOMETRY",
    capability: "manage_cubes",
    branch: { field: "operation", value: "update" },
    knowledge: "UNKNOWN",
    needs_schema: true,
    facts: { project_bound: true, geometry_available: true },
  },
  {
    id: "geometry-create-stale-schema",
    domain: "GEOMETRY",
    capability: "manage_cubes",
    branch: { field: "operation", value: "create" },
    knowledge: "SCHEMA_STALE",
    needs_schema: true,
    facts: { project_bound: true },
  },
  {
    id: "geometry-inspect-known",
    domain: "GEOMETRY",
    capability: "inspect_elements",
    branch: { field: "mode", value: "detail" },
    knowledge: "KNOWN",
    needs_schema: false,
    facts: { project_bound: true },
  },
  {
    id: "geometry-inspect-unknown",
    domain: "GEOMETRY",
    capability: "inspect_elements",
    branch: { field: "mode", value: "search" },
    knowledge: "UNKNOWN",
    needs_schema: true,
    facts: { project_bound: true },
  },
  {
    id: "geometry-reparent-nonhot",
    domain: "GEOMETRY",
    capability: "reparent_element",
    knowledge: "UNKNOWN",
    needs_schema: false,
    facts: { project_bound: true, geometry_available: true },
  },
  {
    id: "texture-blank-unknown",
    domain: "TEXTURING",
    capability: "create_texture",
    branch: { field: "type", value: "blank" },
    knowledge: "UNKNOWN",
    needs_schema: true,
    facts: { project_bound: true },
  },
  {
    id: "texture-template-blocked",
    domain: "TEXTURING",
    capability: "create_texture",
    branch: { field: "type", value: "template" },
    knowledge: "BLOCKED",
    needs_schema: true,
    facts: { project_bound: true, geometry_available: false },
  },
  {
    id: "material-create-unknown",
    domain: "TEXTURING",
    capability: "manage_material",
    branch: { field: "operation", value: "create" },
    knowledge: "UNKNOWN",
    needs_schema: true,
    facts: { project_bound: true },
  },
  {
    id: "material-configure-unknown-precondition",
    domain: "TEXTURING",
    capability: "manage_material",
    branch: { field: "operation", value: "configure" },
    knowledge: "UNKNOWN_PRECONDITION",
    needs_schema: true,
    facts: { project_bound: true, material_available: "unknown" },
  },
  {
    id: "gradient-nonhot",
    domain: "TEXTURING",
    capability: "gradient_tool",
    knowledge: "UNKNOWN",
    needs_schema: false,
    facts: { project_bound: true, texture_available: true },
  },
  {
    id: "animation-timeline-nonhot",
    domain: "ANIMATION",
    capability: "manage_animation_timeline",
    branch: { field: "operation", value: "timeline" },
    knowledge: "UNKNOWN",
    needs_schema: false,
    facts: { project_bound: true, animation_available: true },
  },
  {
    id: "animation-timeline-blocked",
    domain: "ANIMATION",
    capability: "manage_animation_timeline",
    branch: { field: "operation", value: "timeline" },
    knowledge: "BLOCKED",
    needs_schema: false,
    facts: { project_bound: true, animation_available: false },
  },
  {
    id: "particle-authoring",
    domain: "PARTICLE",
    capability: "manage_particle",
    knowledge: "UNKNOWN",
    needs_schema: false,
    facts: { project_bound: true },
  },
  {
    id: "particle-inspection",
    domain: "PARTICLE",
    capability: "inspect_particle",
    knowledge: "KNOWN",
    needs_schema: false,
    facts: { project_bound: true },
  },
  {
    id: "mixed-model-bounds-known",
    domain: "MIXED",
    capability: "inspect_model_bounds",
    knowledge: "KNOWN",
    needs_schema: false,
    facts: { project_bound: true, geometry_available: true },
  },
  {
    id: "mixed-render-profile-stale",
    domain: "MIXED",
    capability: "manage_render_profile",
    knowledge: "SCHEMA_STALE",
    needs_schema: true,
    facts: { project_bound: true, texture_available: true },
  },
  {
    id: "recovery-project-not-bound-hot",
    domain: "RECOVERY",
    capability: "manage_cubes",
    branch: { field: "operation", value: "create" },
    knowledge: "BLOCKED",
    needs_schema: true,
    facts: { project_bound: false },
  },
  {
    id: "unknown-capability-fallback",
    domain: "RECOVERY",
    capability: "future_unknown_capability",
    knowledge: "UNKNOWN",
    needs_schema: true,
    facts: { project_bound: true },
  },
];
