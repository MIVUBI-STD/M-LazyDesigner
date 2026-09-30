/// <reference types="three" />
/// <reference types="blockbench-types" />

import { tools, prompts } from "@/lib/factories";
import { DEFAULT_MCP_REGISTRATION_PROFILE } from "@/lib/capabilities/registrationProfile";
import {
  DEFAULT_MCP_AUTHORING_STAGE,
  setActiveMcpAuthoringStage,
} from "@/lib/capabilities/authoringStage";
import { registerMcpProfile } from "./runtime/registration";

export {
  consolidatedAnimationTimelineToolDocs,
  consolidatedInspectionToolDocs,
  consolidatedMaterialInstancesToolDocs,
  consolidatedMaterialToolDocs,
} from "./runtime/consolidatedTools";

export {
  applyMcpRegistrationProfile,
  applyMcpToolSurface,
  describeMcpSurfaceToolNames,
  getActiveMcpRegistrationProfile,
  getMcpSurfaceDescriptor,
  getMcpSurfaceToolNames,
  getToolCount,
  getToolRegistrationFamily,
  isCatalogToolEnabled,
  registerMcpProfile,
  setMcpProfileSwitchHandler,
  type McpSurfaceDescriptor,
} from "./runtime/registration";

export {
  phaseControlToolDocs,
  requestMcpStageSwitch,
  setMcpStageSwitchHandler,
  requestMcpPhaseSwitch,
  setMcpPhaseSwitchHandler,
} from "./runtime/phaseControl";

// Build the canonical normal Bedrock catalog once at module load. Plugin startup
// later narrows exposure to one profile + Authoring Stage without redefining tools.
registerMcpProfile(DEFAULT_MCP_REGISTRATION_PROFILE);

// Keep a deterministic Stage value for helpers/tests before plugin startup,
// without mutating authored enabled flags until applyMcpToolSurface is called.
setActiveMcpAuthoringStage(DEFAULT_MCP_AUTHORING_STAGE);

// Compatibility facade for existing imports. Runtime ownership lives under
// server/runtime/*; callers should not need to know that internal split.
export { tools, prompts };
