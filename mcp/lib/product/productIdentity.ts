import { VERSION } from "@/lib/constants";
import type { McpRegistrationProfile } from "@/lib/capabilities/registrationProfile";
import {
  getActiveMcpAuthoringStage,
  type McpAuthoringStage,
} from "@/lib/capabilities/authoringStage";

export const PRODUCT_ID = "lazydesigner-bedrock-entity-mcp";
export const PRODUCT_NAME = "LazyDesigner — Bedrock Entity MCP";
export const PRODUCT_DESCRIPTION =
  "AI-assisted Minecraft Bedrock Entity authoring for Blockbench.";
export const PRODUCT_ABOUT =
  "Create Minecraft Bedrock models, textures, and animations with AI in Blockbench.";
export const PRODUCT_REPOSITORY =
  "https://github.com/MIVUBI-STD/M-LazyDesigner";
export const PRODUCT_BUG_TRACKER = `${PRODUCT_REPOSITORY}/issues`;
export const PRODUCT_VERSION = VERSION;

export function createProductIdentity(
  profile: McpRegistrationProfile,
  authoringStage: McpAuthoringStage = getActiveMcpAuthoringStage()
) {
  return {
    id: PRODUCT_ID,
    name: PRODUCT_NAME,
    version: PRODUCT_VERSION,
    profile,
    authoring_phase: authoringStage,
    repository: PRODUCT_REPOSITORY,
  } as const;
}
