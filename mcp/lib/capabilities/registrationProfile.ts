export type McpRegistrationProfile = "bedrock_entity" | "extended";

export type McpRegistrationFamily =
  | "animation"
  | "animation_inspection"
  | "camera"
  | "cubes"
  | "elements"
  | "element_inspection"
  | "export"
  | "history"
  | "import"
  | "material_instances"
  | "paint"
  | "project"
  | "phase_control"
  | "textures"
  | "ui"
  | "validator_resources";

export const MCP_EXTENDED_FAMILIES_SETTING_ID =
  "mcp_extended_families_enabled";

/**
 * The normal LazyDesigner Bedrock Entity registration profile.
 *
 * Keep every family that is native/relevant to the Bedrock Entity workflow
 * available here. Registration reduction is not permission to delete or
 * silently gate native Bedrock capability merely because it is optional in a
 * particular modelling pass.
 */
export const BEDROCK_ENTITY_REGISTRATION_FAMILIES = [
  "animation",
  "animation_inspection",
  "camera",
  "cubes",
  "elements",
  "element_inspection",
  "export",
  "history",
  "material_instances",
  "paint",
  "project",
  "phase_control",
  "textures",
  "validator_resources",
] as const satisfies readonly McpRegistrationFamily[];

/**
 * Generic Blockbench fallback families retained in source but not exposed by
 * the normal Bedrock Entity profile.
 *
 * Extended compatibility does not re-enable `risky_eval` or `from_geo_json`
 * because those tools remain individually disabled at their createTool()
 * boundary.
 */
export const EXTENDED_LEGACY_REGISTRATION_FAMILIES = [
  "import",
  "ui",
] as const satisfies readonly McpRegistrationFamily[];

export const DEFAULT_MCP_REGISTRATION_PROFILE: McpRegistrationProfile =
  "bedrock_entity";

/**
 * Explicit extended-family opt-in. Only the literal boolean `true` promotes
 * the registration profile; missing, malformed, or default setting values stay
 * on the Bedrock Entity profile.
 */
export function resolveMcpRegistrationProfile(
  extendedFamiliesEnabled: unknown
): McpRegistrationProfile {
  return extendedFamiliesEnabled === true
    ? "extended"
    : DEFAULT_MCP_REGISTRATION_PROFILE;
}

export function getRegistrationFamilies(
  profile: McpRegistrationProfile = DEFAULT_MCP_REGISTRATION_PROFILE
): readonly McpRegistrationFamily[] {
  if (profile === "extended") {
    return [
      ...BEDROCK_ENTITY_REGISTRATION_FAMILIES,
      ...EXTENDED_LEGACY_REGISTRATION_FAMILIES,
    ];
  }

  return BEDROCK_ENTITY_REGISTRATION_FAMILIES;
}
