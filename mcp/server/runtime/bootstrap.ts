import { DEFAULT_MCP_REGISTRATION_PROFILE } from "@/lib/registrationProfile";
import { registerMcpProfile } from "./registration";
import { wireAuthoringQualityIntelligence } from "../tools/quality-intelligence";
import { wireAuthoringEvidenceRuntime } from "../tools/quality-evidence-runtime";
import { wireTextureQualityRuntime } from "../tools/texture-quality-runtime";
import { wireTextureAuthoringRuntime } from "../tools/texture-authoring-runtime";
import { wireTextureAlphaRuntime } from "../tools/texture-alpha-runtime";
import { wireAnimationNativeIntelligence } from "../tools/animation-native-intelligence";
import { wireAnimationControllerNativeIntelligence } from "../tools/animation-controller-native-intelligence";
import { wireAnimationRuntimeResourceIntelligence } from "../tools/animation-runtime-resource-intelligence";

let initialized = false;

/**
 * Wire generation-stable intelligence into existing canonical tool definitions.
 * Registration is guaranteed first because server.ts can be imported before the
 * compatibility tools facade during isolated Runtime tests and request setup.
 * This does not create a second catalog and is idempotent within one module load.
 */
export function initializeRuntimeCapabilityWiring(): void {
  if (initialized) return;

  registerMcpProfile(DEFAULT_MCP_REGISTRATION_PROFILE);
  initialized = true;

  wireAuthoringQualityIntelligence();
  wireAuthoringEvidenceRuntime();
  wireTextureQualityRuntime();
  wireTextureAuthoringRuntime();
  wireTextureAlphaRuntime();
  wireAnimationNativeIntelligence();
  wireAnimationControllerNativeIntelligence();
  wireAnimationRuntimeResourceIntelligence();
}
