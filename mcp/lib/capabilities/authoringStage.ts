import type { McpRegistrationFamily } from "./registrationProfile";
import { capabilityPhaseByName } from "./manifest";

/** Compatibility-bound serialized setting ID. Product semantics use Stage + Runtime Surface. */
export const MCP_AUTHORING_PHASE_SETTING_ID = "mcp_authoring_phase";
export const MCP_HANDOFF_REQUIRED = "HANDOFF_REQUIRED";

export const MCP_AUTHORING_STAGES = [
  "geometry",
  "texturing",
  "animation",
] as const;

/** Internal compatibility name. In product semantics this value is the Authoring Stage. */
export type McpAuthoringStage = (typeof MCP_AUTHORING_STAGES)[number];
export type McpToolStageCategory = "core" | McpAuthoringStage;
export type McpRuntimeSurface = "AUTHORING" | "ANIMATION";

export const DEFAULT_MCP_AUTHORING_STAGE: McpAuthoringStage = "geometry";

export const BEDROCK_AUTHORING_COORDINATE_CONTRACT =
  "Coords: 16 Blockbench units=1 Minecraft block; x=width,y=height,z=length,+Y=up.";

let activeAuthoringStage: McpAuthoringStage = DEFAULT_MCP_AUTHORING_STAGE;

const CORE_FAMILIES = new Set<McpRegistrationFamily>([
  "camera",
  "element_inspection",
  "export",
  "history",
  "project",
  "phase_control",
  "import",
  "ui",
]);

const CORE_ELEMENT_TOOLS = new Set(["inspect_elements"]);
const GEOMETRY_ELEMENT_TOOLS = new Set([
  "modify_group",
  "remove_element",
  "rename_element",
]);
const AUTHORING_SELECTION_TOOLS = new Set([
  "select_all_of_type",
  "get_selection",
]);
const CORE_TEXTURE_TOOLS = new Set(["list_textures"]);
const ANIMATION_EXCLUDED_CORE_TOOLS = new Set(["create_project"]);

export function classifyMcpToolStageByName(
  toolName: string
): McpToolStageCategory | null {
  return capabilityPhaseByName(toolName);
}

export function getMcpRuntimeSurface(
  phase: McpAuthoringStage
): McpRuntimeSurface {
  return phase === "animation" ? "ANIMATION" : "AUTHORING";
}

const STAGE_OWNER_SUMMARY: Record<McpAuthoringStage, string> = {
  geometry: "AUTHORING focus: Geometry/rig/UV Layout.",
  texturing: "AUTHORING focus: Texture/Painter/PBR/Texture Verify.",
  animation: "ANIMATION focus: motion/keyframes/effects/controllers.",
};

const STAGE_READINESS_SUMMARY: Record<McpAuthoringStage, string> = {
  geometry:
    "Internal PASS plus UV Readiness Preflight means READY_FOR_USER_REVIEW, never user approval. Geometry APPROVED precedes production UV Layout PASS; Texture APPROVED plus a saved .bbmodel checkpoint precedes Animation/finalization.",
  texturing:
    "Animation handoff requires explicit user Geometry and Texture APPROVED, uv_layout=PASS, a saved .bbmodel checkpoint, and Animation Readiness Preflight confirming participating hierarchy/pivots/attachments/clearance with no unresolved Authoring blocker. Internal PASS is only READY_FOR_USER_REVIEW.",
  animation:
    "Animation completion readiness: requested motion is verified; structural/UV/texture defects return to AUTHORING.",
};

export function isMcpAuthoringStage(value: unknown): value is McpAuthoringStage {
  return MCP_AUTHORING_STAGES.includes(value as McpAuthoringStage);
}

export function resolveMcpAuthoringStage(value: unknown): McpAuthoringStage {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_MCP_AUTHORING_STAGE;
  }
  if (isMcpAuthoringStage(value)) return value;
  throw new Error(
    `Invalid MCP Authoring Stage "${String(value)}". Expected geometry, texturing, or animation.`
  );
}

export function setActiveMcpAuthoringStage(phase: McpAuthoringStage): void {
  activeAuthoringStage = phase;
}

export function getActiveMcpAuthoringStage(): McpAuthoringStage {
  return activeAuthoringStage;
}

export function getMcpStageOwnerSummary(phase: McpAuthoringStage): string {
  return STAGE_OWNER_SUMMARY[phase];
}

export function getMcpStageReadinessSummary(phase: McpAuthoringStage): string {
  return STAGE_READINESS_SUMMARY[phase] + " Exception: explicit user authorization for autonomous execution replaces intermediate approval waits with current-revision technical/visual PASS and a saved checkpoint. Use autonomous_authorized, geometry_verified, texture_verified, uv_layout, evidence, checkpoint, no_blockers readiness; never claim user approval.";
}

export function buildMcpStageRuntimeContract(
  phase: McpAuthoringStage,
  allowedTools: readonly string[] = []
): string {
  const label = phase.toUpperCase();
  const surface = getMcpRuntimeSurface(phase);
  const allowed =
    allowedTools.length > 0
      ? ` Allowed tools (${allowedTools.length}): ${allowedTools.join(", ")}.`
      : "";
  const transition = surface === "AUTHORING"
    ? "Geometry↔Texturing stays in AUTHORING."
    : "Upstream correction requires AUTHORING handoff.";
  return [
    `ACTIVE STAGE: ${label}. MCP CORE + ${surface} tools available.`,
    BEDROCK_AUTHORING_COORDINATE_CONTRACT,
    STAGE_OWNER_SUMMARY[phase],
    "Do not search for, emulate, rename, or substitute foreign tools.",
    transition,
    `${MCP_HANDOFF_REQUIRED} only AUTHORING↔ANIMATION: target_phase, reason, readiness, resume_from; use switch_authoring_phase through Gateway.${allowed}`,
  ].join(" ");
}

export function buildMcpStagePromptHeader(
  phase: McpAuthoringStage,
  allowedTools: readonly string[] = []
): string {
  return [
    "## Active Stage Contract",
    buildMcpStageRuntimeContract(phase, allowedTools),
    getMcpRuntimeSurface(phase) === "AUTHORING"
      ? "Geometry and Texturing guidance share the AUTHORING Runtime surface."
      : "Animation guidance is isolated; upstream correction returns to AUTHORING.",
  ].join("\n\n");
}

export function buildMcpStageHandoffContract(
  phase: McpAuthoringStage
): string {
  if (getMcpRuntimeSurface(phase) === "AUTHORING") {
    return [
      "## Authoring Stage / Surface Handoff",
      getMcpStageReadinessSummary(phase),
      "Geometry↔Texturing correction does not require HANDOFF_REQUIRED; use the semantic owner directly in AUTHORING.",
      `${MCP_HANDOFF_REQUIRED} is only AUTHORING↔ANIMATION through switch_authoring_phase via Gateway; continue the same task/chat with target_phase, reason, readiness, resume_from.`,
    ].join("\n\n");
  }
  return [
    "## Stage / Surface Handoff",
    getMcpStageReadinessSummary(phase),
    "Keep target_phase, reason, readiness, resume_from.",
    `${MCP_HANDOFF_REQUIRED}: STOP Animation mutation routes, invoke switch_authoring_phase through Gateway, then continue the same task on the shared AUTHORING surface.`,
  ].join("\n\n");
}

export function classifyMcpToolStage(
  toolName: string,
  family: McpRegistrationFamily
): McpToolStageCategory | null {
  const namedPhase = classifyMcpToolStageByName(toolName);
  if (namedPhase !== null) return namedPhase;

  if (family === "phase_control") return "core";
  if (
    toolName === "capture_screenshot" ||
    toolName === "capture_app_screenshot" ||
    toolName === "set_camera_angle" ||
    toolName === "list_export_formats" ||
    toolName === "save_checkpoint"
  ) return null;
  if (
    toolName === "list_locator_elements" ||
    toolName === "undo" ||
    toolName === "redo" ||
    toolName === "get_undo_stack"
  ) return "core";
  if (CORE_FAMILIES.has(family)) return "core";
  if (family === "cubes") return "geometry";
  if (family === "textures") {
    return CORE_TEXTURE_TOOLS.has(toolName) ? "core" : "texturing";
  }
  if (family === "paint" || family === "material_instances") return "texturing";
  if (family === "animation_inspection") return "animation";
  if (family === "animation") {
    return toolName === "bone_rigging" ? "geometry" : "animation";
  }
  if (family === "elements") {
    if (CORE_ELEMENT_TOOLS.has(toolName)) return "core";
    if (AUTHORING_SELECTION_TOOLS.has(toolName)) return "geometry";
    if (GEOMETRY_ELEMENT_TOOLS.has(toolName)) return "geometry";
    if (toolName === "filter_by_material") return "texturing";
  }
  return null;
}

export function isMcpToolExposedForStage(
  toolName: string,
  family: McpRegistrationFamily,
  phase: McpAuthoringStage
): boolean {
  if (
    getMcpRuntimeSurface(phase) === "ANIMATION" &&
    ANIMATION_EXCLUDED_CORE_TOOLS.has(toolName)
  ) {
    return false;
  }

  const category = classifyMcpToolStage(toolName, family);
  if (category === "core") return true;
  return getMcpRuntimeSurface(phase) === "ANIMATION"
    ? category === "animation"
    : category === "geometry" || category === "texturing";
}


// Compatibility aliases for serialized/API surfaces that still use "phase".
export const MCP_AUTHORING_PHASES = MCP_AUTHORING_STAGES;
export type McpAuthoringPhase = McpAuthoringStage;
export type McpToolPhaseCategory = McpToolStageCategory;
export const DEFAULT_MCP_AUTHORING_PHASE = DEFAULT_MCP_AUTHORING_STAGE;
export const isMcpAuthoringPhase = isMcpAuthoringStage;
export const resolveMcpAuthoringPhase = resolveMcpAuthoringStage;
export const setActiveMcpAuthoringPhase = setActiveMcpAuthoringStage;
export const getActiveMcpAuthoringPhase = getActiveMcpAuthoringStage;
export const getMcpPhaseOwnerSummary = getMcpStageOwnerSummary;
export const getMcpPhaseReadinessSummary = getMcpStageReadinessSummary;
export const buildMcpPhaseRuntimeContract = buildMcpStageRuntimeContract;
export const buildMcpPhasePromptHeader = buildMcpStagePromptHeader;
export const buildMcpPhaseHandoffContract = buildMcpStageHandoffContract;
export const classifyMcpToolPhaseByName = classifyMcpToolStageByName;
export const classifyMcpToolPhase = classifyMcpToolStage;
export const isMcpToolExposedForPhase = isMcpToolExposedForStage;
