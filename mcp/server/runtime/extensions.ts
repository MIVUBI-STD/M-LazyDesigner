import { wireAnimationRuntimeContracts } from "./animationRuntimeContracts";
import { wireAuthoringQualityIntelligence } from "../tools/quality-intelligence";
import { wireAuthoringEvidenceRuntime } from "../tools/quality-evidence-runtime";
import { wireTextureQualityRuntime } from "../tools/texture-quality-runtime";
import { wireTextureAuthoringRuntime } from "../tools/texture-authoring-runtime";
import { wireTextureAlphaRuntime } from "../tools/texture-alpha-runtime";
import { wireAnimationNativeIntelligence } from "../tools/animation-native-intelligence";
import { wireAnimationControllerNativeIntelligence } from "../tools/animation-controller-native-intelligence";
import { wireAnimationRuntimeResourceIntelligence } from "../tools/animation-runtime-resource-intelligence";
import { wireTextureRuntimeContracts } from "./textureRuntimeContracts";

export type RuntimeExtensionStep = Readonly<{
  id: string;
  targets: readonly string[];
  apply: () => void;
}>;

/**
 * Canonical Runtime extension composition order.
 *
 * Tool registration owns base definitions. Runtime extensions may enrich those
 * definitions, but the ordering and overlap are owned here so wrapper behavior
 * is explicit, reviewable, and testable rather than hidden across imports.
 */
export const RUNTIME_EXTENSION_PIPELINE: readonly RuntimeExtensionStep[] = Object.freeze([
  {
    id: "texture-contracts",
    targets: ["create_texture", "get_texture"],
    apply: wireTextureRuntimeContracts,
  },
  {
    id: "animation-contracts",
    targets: ["manage_animation_timeline", "inspect_animation", "capture_model_views"],
    apply: wireAnimationRuntimeContracts,
  },
  {
    id: "authoring-quality",
    targets: ["inspect_model_bounds", "list_textures", "get_texture", "inspect_animation"],
    apply: wireAuthoringQualityIntelligence,
  },
  {
    id: "authoring-evidence",
    targets: ["inspect_model_bounds", "list_textures", "inspect_animation"],
    apply: wireAuthoringEvidenceRuntime,
  },
  {
    id: "texture-quality",
    targets: ["list_textures", "manage_material"],
    apply: wireTextureQualityRuntime,
  },
  {
    id: "texture-authoring",
    targets: ["list_textures", "list_materials", "get_material_info", "manage_material"],
    apply: wireTextureAuthoringRuntime,
  },
  {
    id: "texture-alpha",
    targets: ["get_texture"],
    apply: wireTextureAlphaRuntime,
  },
  {
    id: "animation-native",
    targets: ["manage_animation_timeline", "inspect_animation"],
    apply: wireAnimationNativeIntelligence,
  },
  {
    id: "animation-controller-native",
    targets: ["manage_animation_controller"],
    apply: wireAnimationControllerNativeIntelligence,
  },
  {
    id: "animation-runtime-resources",
    targets: ["manage_animation_controller", "inspect_animation"],
    apply: wireAnimationRuntimeResourceIntelligence,
  },
]);

export function applyRuntimeExtensionPipeline(): void {
  for (const step of RUNTIME_EXTENSION_PIPELINE) step.apply();
}
