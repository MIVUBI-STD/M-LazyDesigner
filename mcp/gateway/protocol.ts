import { version } from "../package.json";
import type { CapabilityTier } from "../lib/capabilityMetadata";
import type {
  CapabilityBranchHint,
  CapabilityRoutingContext,
} from "./capabilities/intelligence";
import type {
  CapabilityEligibility,
  CapabilityFactState,
} from "./capabilities/graph";

export const GATEWAY_NAME = "blockit-gateway";
export const GATEWAY_VERSION = version;

export const GATEWAY_TOOLS = {
  status: "status",
  searchCapabilities: "search_capabilities",
  describeCapability: "describe_capability",
  invokeCapability: "invoke_capability",
} as const;

export const GATEWAY_TOOL_NAMES = Object.values(GATEWAY_TOOLS);

export type JsonRecord = Record<string, unknown>;

export type BackendToolAnnotations = {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
  [key: string]: unknown;
};

export type BackendTool = {
  name: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
  annotations?: BackendToolAnnotations;
  [key: string]: unknown;
};

export type { CapabilityTier };

export type CapabilitySummary = {
  capability_id: string;
  description: string;
  tier: CapabilityTier;
  read_only: boolean;
  destructive: boolean;
  idempotent: boolean;
  branch?: CapabilityBranchHint;
  why?: string;
  eligibility?: CapabilityEligibility;
  requires?: string[];
  predecessor?: {
    capability: string;
    branch?: CapabilityBranchHint;
  };
};

export type CapabilitySearchContext = CapabilityRoutingContext & {
  facts?: CapabilityFactState;
};
