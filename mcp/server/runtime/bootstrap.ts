import { DEFAULT_MCP_REGISTRATION_PROFILE } from "@/lib/registrationProfile";
import { registerMcpProfile } from "./registration";

let initialized = false;

/**
 * Initialize the canonical Runtime once. Registration owns base capability
 * creation and invokes the single Runtime extension pipeline after the base and
 * consolidated definitions exist.
 */
export function initializeRuntimeCapabilityWiring(): void {
  if (initialized) return;

  registerMcpProfile(DEFAULT_MCP_REGISTRATION_PROFILE);
  initialized = true;
}
