import { McpServer } from "@modelcontextprotocol/server";

/// <reference types="three" />
/// <reference types="blockbench-types" />
import { PRODUCT_NAME, PRODUCT_VERSION } from "@/lib/product/productIdentity";
import {
  DEFAULT_MCP_AUTHORING_STAGE,
  buildMcpStageRuntimeContract,
  getActiveMcpAuthoringStage,
  type McpAuthoringStage,
} from "@/lib/capabilities/authoringStage";
import {
  DEFAULT_MCP_REGISTRATION_PROFILE,
  type McpRegistrationProfile,
} from "@/lib/capabilities/registrationProfile";
import { initializeRuntimeCapabilityWiring } from "./runtime/bootstrap";
import {
  conformanceFixturesEnabled,
  getConformanceRequestStateCodec,
  wireConformanceFixtures,
} from "./conformanceFixtures";

// Existing canonical tools gain bounded runtime intelligence once per module
// load. The bootstrap mutates definitions only; it does not own a second catalog.
initializeRuntimeCapabilityWiring();

const serverInstructionCache = new Map<McpAuthoringStage, string>();

/**
 * Stage-aware server instructions are generation-stable. Cache the immutable
 * string once per stage so request-owned MCP servers do not rebuild identical
 * contracts on every stateless request.
 */
export function buildMcpServerInstructions(
  stage: McpAuthoringStage,
  _profile: McpRegistrationProfile = DEFAULT_MCP_REGISTRATION_PROFILE
): string {
  const cached = serverInstructionCache.get(stage);
  if (cached) return cached;

  const instructions = `LazyDesigner Bedrock Entity authoring. ${buildMcpStageRuntimeContract(
    stage
  )} Capability nouns: cube, texture/PBR, locator; Animation uses keyframe tooling. Core routes are lifecycle and read operations; selection, history, camera, and export are conditional support routes.`;
  serverInstructionCache.set(stage, instructions);
  return instructions;
}

export const MCP_SERVER_INSTRUCTIONS = buildMcpServerInstructions(
  DEFAULT_MCP_AUTHORING_STAGE
);

/** Create one request-owned MCP server instance. */
export function createServer(
  stage: McpAuthoringStage = getActiveMcpAuthoringStage(),
  profile: McpRegistrationProfile = DEFAULT_MCP_REGISTRATION_PROFILE
): McpServer {
  const server = new McpServer(
    {
      name: PRODUCT_NAME,
      version: PRODUCT_VERSION,
    },
    {
      instructions: buildMcpServerInstructions(stage, profile),
      ...(conformanceFixturesEnabled()
        ? {
            requestState: {
              verify: getConformanceRequestStateCodec().verify,
            },
          }
        : {}),
    }
  );
  if (conformanceFixturesEnabled()) wireConformanceFixtures(server);
  return server;
}