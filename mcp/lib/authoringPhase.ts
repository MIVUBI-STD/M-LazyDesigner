import type { McpRegistrationFamily } from "@/lib/registrationProfile";

export const MCP_AUTHORING_PHASE_SETTING_ID = "mcp_authoring_phase";
export const MCP_HANDOFF_REQUIRED = "HANDOFF_REQUIRED";

export const MCP_AUTHORING_PHASES = [
  "geometry",
  "texturing",
  "animation",
] as const;

export type McpAuthoringPhase = (typeof MCP_AUTHORING_PHASES)[number];
export type McpToolPhaseCategory = "core" | McpAuthoringPhase;
export type McpRuntimeSurface = "AUTHORING" | "ANIMATION";

export const DEFAULT_MCP_AUTHORING_PHASE: McpAuthoringPhase = "geometry";

export const BEDROCK_AUTHORING_COORDINATE_CONTRACT =
  "Coords: 16 Blockbench units=1 Minecraft block; x=width,y=height,z=length,+Y=up.";

let activeAuthoringPhase: McpAuthoringPhase = DEFAULT_MCP_AUTHORING_PHASE;

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
const GEOMETRY_MAINTENANCE_TOOLS = new Set([
  "add_group",
  "manage_cubes",
  "duplicate_element",
  "reparent_element",
  "manage_locator",
  "manage_null_object",
]);
const AUTHORING_SELECTION_TOOLS = new Set([
  "select_all_of_type",
  "get_selection",
]);
const CORE_TEXTURE_TOOLS = new Set(["list_textures"]);
const ANIMATION_EXCLUDED_CORE_TOOLS = new Set(["create_project"]);

/**
 * Import-safe canonical phase hints for public and retained capability names.
 * Runtime family classification below remains the fallback for catalog tools,
 * while Gateway/Control can classify by name without owning a second domain
 * table. Keep semantic phase ownership here only.
 */
const CORE_NAMED_CAPABILITIES = new Set([
  "create_project",
  "get_project_info",
  "inspect_elements",
  "capture_model_views",
  "inspect_model_bounds",
  "export_model",
  "undo",
  "redo",
  "get_undo_stack",
  "switch_authoring_phase",
  "list_textures",
]);

const GEOMETRY_NAMED_CAPABILITIES = new Set([
  ...GEOMETRY_MAINTENANCE_TOOLS,
  ...GEOMETRY_ELEMENT_TOOLS,
  ...AUTHORING_SELECTION_TOOLS,
  "bone_rigging",
]);

const TEXTURING_NAMED_CAPABILITIES = new Set([
  "create_texture",
  "get_texture",
  "activate_texture",
  "apply_texture",
  "add_texture_group",
  "create_pbr_material",
  "configure_material",
  "list_materials",
  "get_material_info",
  "import_texture_set",
  "assign_texture_channel",
  "save_material_config",
  "paint_fill_tool",
  "draw_shape_tool",
  "gradient_tool",
  "color_picker_tool",
  "copy_brush_tool",
  "eraser_tool",
  "paint_settings",
  "paint_with_brush",
  "create_brush_preset",
  "load_brush_preset",
  "texture_selection",
  "texture_layer_management",
  "paint_texture_transaction",
  "manage_material",
  "get_face_material_instances",
  "set_face_material_instance",
  "list_material_instances",
  "bulk_set_material_instances",
  "clear_material_instances",
  "manage_material_instances",
  "manage_render_profile",
  "filter_by_material",
]);

const ANIMATION_NAMED_CAPABILITIES = new Set([
  "create_animation",
  "manage_keyframes",
  "animation_graph_editor",
  "animation_timeline",
  "batch_keyframe_operations",
  "animation_copy_paste",
  "inspect_animation",
  "manage_animation_timeline",
  "manage_animation_effects",
  "manage_animation_controller",
  "inspect_particle",
  "manage_particle",
]);

export function classifyMcpToolPhaseByName(
  toolName: string
): McpToolPhaseCategory | null {
  if (CORE_NAMED_CAPABILITIES.has(toolName)) return "core";
  if (GEOMETRY_NAMED_CAPABILITIES.has(toolName)) return "geometry";
  if (TEXTURING_NAMED_CAPABILITIES.has(toolName)) return "texturing";
  if (ANIMATION_NAMED_CAPABILITIES.has(toolName)) return "animation";
  return null;
}

export function getMcpRuntimeSurface(
  phase: McpAuthoringPhase
): McpRuntimeSurface {
  return phase === "animation" ? "ANIMATION" : "AUTHORING";
}

const PHASE_OWNER_SUMMARY: Record<McpAuthoringPhase, string> = {
  geometry: "AUTHORING focus: Geometry/rig/UV Layout.",
  texturing: "AUTHORING focus: Texture/Painter/PBR/Texture Verify.",
  animation: "ANIMATION focus: motion/keyframes/effects/controllers.",
};

const PHASE_READINESS_SUMMARY: Record<McpAuthoringPhase, string> = {
  geometry:
    "Internal PASS plus UV Readiness Preflight means READY_FOR_USER_REVIEW, never user approval. Geometry APPROVED precedes production UV Layout PASS; Texture APPROVED plus a saved .bbmodel checkpoint precedes Animation/finalization.",
  texturing:
    "Animation handoff requires explicit user Geometry and Texture APPROVED, uv_layout=PASS, a saved .bbmodel checkpoint, and Animation Readiness Preflight confirming participating hierarchy/pivots/attachments/clearance with no unresolved Authoring blocker. Internal PASS is only READY_FOR_USER_REVIEW.",
  animation:
    "Animation completion readiness: requested motion is verified; structural/UV/texture defects return to AUTHORING.",
};

export function isMcpAuthoringPhase(value: unknown): value is McpAuthoringPhase {
  return MCP_AUTHORING_PHASES.includes(value as McpAuthoringPhase);
}

export function resolveMcpAuthoringPhase(value: unknown): McpAuthoringPhase {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_MCP_AUTHORING_PHASE;
  }
  if (isMcpAuthoringPhase(value)) return value;
  throw new Error(
    `Invalid MCP Authoring Phase "${String(value)}". Expected geometry, texturing, or animation.`
  );
}

export function setActiveMcpAuthoringPhase(phase: McpAuthoringPhase): void {
  activeAuthoringPhase = phase;
}

export function getActiveMcpAuthoringPhase(): McpAuthoringPhase {
  return activeAuthoringPhase;
}

export function getMcpPhaseOwnerSummary(phase: McpAuthoringPhase): string {
  return PHASE_OWNER_SUMMARY[phase];
}

export function getMcpPhaseReadinessSummary(phase: McpAuthoringPhase): string {
  return PHASE_READINESS_SUMMARY[phase] + " Exception: explicit user authorization for autonomous execution replaces intermediate approval waits with current-revision technical/visual PASS and a saved checkpoint. Use autonomous_authorized, geometry_verified, texture_verified, uv_layout, evidence, checkpoint, no_blockers readiness; never claim user approval.";
}

export function buildMcpPhaseRuntimeContract(
  phase: McpAuthoringPhase,
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
    PHASE_OWNER_SUMMARY[phase],
    "Do not search for, emulate, rename, or substitute foreign tools.",
    transition,
    `${MCP_HANDOFF_REQUIRED} only AUTHORING↔ANIMATION: target_phase, reason, readiness, resume_from; use switch_authoring_phase through Gateway.${allowed}`,
  ].join(" ");
}

export function buildMcpPhasePromptHeader(
  phase: McpAuthoringPhase,
  allowedTools: readonly string[] = []
): string {
  return [
    "## Active Stage Contract",
    buildMcpPhaseRuntimeContract(phase, allowedTools),
    getMcpRuntimeSurface(phase) === "AUTHORING"
      ? "Geometry and Texturing guidance share the AUTHORING Runtime surface."
      : "Animation guidance is isolated; upstream correction returns to AUTHORING.",
  ].join("\n\n");
}

export function buildMcpPhaseHandoffContract(
  phase: McpAuthoringPhase
): string {
  if (getMcpRuntimeSurface(phase) === "AUTHORING") {
    return [
      "## Authoring Focus / Handoff",
      getMcpPhaseReadinessSummary(phase),
      "Geometry↔Texturing correction does not require HANDOFF_REQUIRED; use the semantic owner directly in AUTHORING.",
      `${MCP_HANDOFF_REQUIRED} is only AUTHORING↔ANIMATION through switch_authoring_phase via Gateway; continue the same task/chat with target_phase, reason, readiness, resume_from.`,
    ].join("\n\n");
  }
  return [
    "## Phase Readiness / Handoff",
    getMcpPhaseReadinessSummary(phase),
    "Keep target_phase, reason, readiness, resume_from.",
    `${MCP_HANDOFF_REQUIRED}: STOP Animation mutation routes, invoke switch_authoring_phase through Gateway, then continue the same task on the shared AUTHORING surface.`,
  ].join("\n\n");
}

export function classifyMcpToolPhase(
  toolName: string,
  family: McpRegistrationFamily
): McpToolPhaseCategory | null {
  const namedPhase = classifyMcpToolPhaseByName(toolName);
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

export function isMcpToolExposedForPhase(
  toolName: string,
  family: McpRegistrationFamily,
  phase: McpAuthoringPhase
): boolean {
  if (
    getMcpRuntimeSurface(phase) === "ANIMATION" &&
    ANIMATION_EXCLUDED_CORE_TOOLS.has(toolName)
  ) {
    return false;
  }

  const category = classifyMcpToolPhase(toolName, family);
  if (category === "core") return true;
  return getMcpRuntimeSurface(phase) === "ANIMATION"
    ? category === "animation"
    : category === "geometry" || category === "texturing";
}
