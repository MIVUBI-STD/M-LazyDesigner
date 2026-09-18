import { McpServer } from "@modelcontextprotocol/server";

/// <reference types="three" />
/// <reference types="blockbench-types" />
import { PRODUCT_NAME, PRODUCT_VERSION } from "@/lib/productIdentity";
import {
  DEFAULT_MCP_AUTHORING_PHASE,
  buildMcpPhaseRuntimeContract,
  getActiveMcpAuthoringPhase,
  type McpAuthoringPhase,
} from "@/lib/authoringPhase";
import {
  DEFAULT_MCP_REGISTRATION_PROFILE,
  type McpRegistrationProfile,
} from "@/lib/registrationProfile";
import { initializeRuntimeCapabilityWiring } from "./runtime/bootstrap";

// Existing canonical tools gain bounded runtime intelligence once per module
// load. The bootstrap mutates definitions only; it does not own a second catalog.
initializeRuntimeCapabilityWiring();

const serverInstructionCache = new Map<McpAuthoringPhase, string>();

/**
 * Phase-aware server instructions are generation-stable. Cache the immutable
 * string once per phase so request-owned MCP servers do not rebuild identical
 * contracts on every stateless request.
 */
export function buildMcpServerInstructions(
  phase: McpAuthoringPhase,
  _profile: McpRegistrationProfile = DEFAULT_MCP_REGISTRATION_PROFILE
): string {
  const cached = serverInstructionCache.get(phase);
  if (cached) return cached;

  const instructions = `LazyDesigner Bedrock Entity authoring. ${buildMcpPhaseRuntimeContract(
    phase
  )} Capability nouns: cube, texture/PBR, locator; Animation uses keyframe tooling. Core routes are lifecycle and read operations; selection, history, camera, and export are conditional support routes.`;
  serverInstructionCache.set(phase, instructions);
  return instructions;
}

export const MCP_SERVER_INSTRUCTIONS = buildMcpServerInstructions(
  DEFAULT_MCP_AUTHORING_PHASE
);

/** Create one request-owned MCP server instance. */
export function createServer(
  phase: McpAuthoringPhase = getActiveMcpAuthoringPhase(),
  profile: McpRegistrationProfile = DEFAULT_MCP_REGISTRATION_PROFILE
): McpServer {
  return new McpServer(
    {
      name: PRODUCT_NAME,
      version: PRODUCT_VERSION,
    },
    {
      instructions: buildMcpServerInstructions(phase, profile),
    }
  );
}
