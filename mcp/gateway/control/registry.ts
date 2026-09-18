import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { classifyMcpToolPhaseByName } from "../../lib/authoringPhase";
import type {
  ControlAuthoringDomain,
  ControlContextHandle,
  ControlSourceOwner,
} from "./types";
import type { ControlProfile } from "./referencePackage";

const MODELLING_PATH = ".agents/skills/lazydesigner-modelling/SKILL.md";
const TEXTURING_PATH = ".agents/skills/lazydesigner-texturing/SKILL.md";
const ANIMATION_PATH = ".agents/skills/lazydesigner-animation/SKILL.md";

const PROFILE_PATHS: Record<ControlProfile, string> = {
  PROP_FURNITURE: "docs/03-authoring/modelling/profiles/prop-furniture.md",
  VEHICLE: "docs/03-authoring/modelling/profiles/vehicle.md",
  HUMANOID: "docs/03-authoring/modelling/profiles/humanoid.md",
  CREATURE: "docs/03-authoring/modelling/profiles/creature.md",
  MECHANICAL: "docs/03-authoring/modelling/profiles/mechanical.md",
  PLANT_FOLIAGE: "docs/03-authoring/modelling/profiles/plant-foliage.md",
  GENERIC: "docs/03-authoring/modelling/profiles/generic.md",
};

type CachedHandle = {
  signature: string;
  handle: ControlContextHandle;
};

const contextHandleCache = new Map<string, CachedHandle>();

function contextLabel(path: string): string {
  if (path === MODELLING_PATH) return "skill/modelling";
  if (path === TEXTURING_PATH) return "skill/texturing";
  if (path === ANIMATION_PATH) return "skill/animation";
  const profile = Object.entries(PROFILE_PATHS).find(([, candidate]) => candidate === path)?.[0];
  return profile ? `profile/${profile.toLowerCase().replaceAll("_", "-")}` : "doc/context";
}

function repoFile(path: string): URL {
  return new URL(`../../../${path}`, import.meta.url);
}

async function contentHandle(path: string): Promise<ControlContextHandle> {
  const file = repoFile(path);
  const info = await stat(file);
  const signature = `${info.size}:${info.mtimeMs}`;
  const cached = contextHandleCache.get(path);
  if (cached?.signature === signature) return cached.handle;
  const bytes = await readFile(file);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const handle: ControlContextHandle = {
    id: `ctx:${contextLabel(path)}@${sha256.slice(0, 12)}`,
    path,
    sha256,
  };
  contextHandleCache.set(path, { signature, handle });
  return handle;
}

export async function contextForAuthoringDomain(
  domain: ControlAuthoringDomain | null,
  selectedProfile: ControlProfile | null = null
): Promise<{ required: ControlContextHandle[]; optional: ControlContextHandle[] }> {
  const required: ControlContextHandle[] = [];
  if (domain === "GEOMETRY") {
    required.push(await contentHandle(MODELLING_PATH));
    if (selectedProfile) required.push(await contentHandle(PROFILE_PATHS[selectedProfile]));
  } else if (domain === "TEXTURING") {
    required.push(await contentHandle(TEXTURING_PATH));
  } else if (domain === "ANIMATION") {
    required.push(await contentHandle(ANIMATION_PATH));
  }
  return { required, optional: [] };
}

export function authoringDomainForCapability(capability: string): ControlAuthoringDomain {
  const phase = classifyMcpToolPhaseByName(capability);
  if (phase === "geometry") return "GEOMETRY";
  if (phase === "texturing") return "TEXTURING";
  if (phase === "animation") return "ANIMATION";
  return "CORE";
}

const SOURCE_BY_CAPABILITY: Record<string, ControlSourceOwner> = {
  manage_cubes: {
    source: "mcp/server/tools/cubes.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/model-effectiveness-correction-accuracy.test.ts",
  },
  add_group: {
    source: "mcp/server/tools/element.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/p1-core-ownership.test.ts",
  },
  modify_group: {
    source: "mcp/server/tools/element.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/model-effectiveness-correction-accuracy.test.ts",
  },
  duplicate_element: {
    source: "mcp/server/tools/element.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/prelocal-generic-semantics.test.ts",
  },
  reparent_element: {
    source: "mcp/server/tools/element.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/p1-core-ownership.test.ts",
  },
  remove_element: {
    source: "mcp/server/tools/element.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/p1-core-ownership.test.ts",
  },
  rename_element: {
    source: "mcp/server/tools/element.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/batch-group-rename.test.ts",
  },
  select_all_of_type: {
    source: "mcp/server/tools/element.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/p1-core-ownership.test.ts",
  },
  get_selection: {
    source: "mcp/server/tools/element.ts",
    specialist: null,
    test_owner: "mcp/tests/p1-core-ownership.test.ts",
  },
  inspect_elements: {
    source: "mcp/server/runtime/consolidatedTools.ts",
    specialist: null,
    test_owner: "mcp/tests/consolidated-validation-preservation.test.ts",
  },
  manage_locator: {
    source: "mcp/server/tools/locators.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/bedrock-locator-coverage.test.ts",
  },
  manage_null_object: {
    source: "mcp/server/tools/locators.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/bedrock-locator-coverage.test.ts",
  },
  list_locator_elements: {
    source: "mcp/server/tools/locators.ts",
    specialist: null,
    test_owner: "mcp/tests/bedrock-locator-coverage.test.ts",
  },
  bone_rigging: {
    source: "mcp/server/tools/animation.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/authoring-phase-surface.test.ts",
  },
  capture_model_views: {
    source: "mcp/server/tools/camera.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/camera-framing-contract.test.ts",
  },
  inspect_model_bounds: {
    source: "mcp/server/tools/project.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/rendered-model-bounds-numeric-safety.test.ts",
  },
  create_texture: {
    source: "mcp/server/tools/texture.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/authoring/asset-authoring-usage-slimming.test.ts",
  },
  list_textures: {
    source: "mcp/server/tools/texture.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-authoring-contract.test.ts",
  },
  get_texture: {
    source: "mcp/server/tools/texture.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-authoring-contract.test.ts",
  },
  activate_texture: {
    source: "mcp/server/tools/texture.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-authoring-contract.test.ts",
  },
  add_texture_group: {
    source: "mcp/server/tools/texture.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-authoring-contract.test.ts",
  },
  list_materials: {
    source: "mcp/server/tools/texture.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-authoring-contract.test.ts",
  },
  get_material_info: {
    source: "mcp/server/tools/texture.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-authoring-contract.test.ts",
  },
  import_texture_set: {
    source: "mcp/server/tools/texture.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-authoring-contract.test.ts",
  },
  paint_fill_tool: {
    source: "mcp/server/tools/paint.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  draw_shape_tool: {
    source: "mcp/server/tools/paint.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  gradient_tool: {
    source: "mcp/server/tools/paint.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  color_picker_tool: {
    source: "mcp/server/tools/paint.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  copy_brush_tool: {
    source: "mcp/server/tools/paint.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  paint_settings: {
    source: "mcp/server/tools/paint.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  paint_with_brush: {
    source: "mcp/server/tools/paint.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-stroke.test.ts",
  },
  eraser_tool: {
    source: "mcp/server/tools/paint.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  create_brush_preset: {
    source: "mcp/server/tools/paint.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  load_brush_preset: {
    source: "mcp/server/tools/paint.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  texture_selection: {
    source: "mcp/server/tools/paint.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  texture_layer_management: {
    source: "mcp/server/tools/paint.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  paint_texture_transaction: {
    source: "mcp/server/tools/prelocal-wiring.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/prelocal-wiring-policy.test.ts",
  },
  manage_material: {
    source: "mcp/server/runtime/consolidatedTools.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/consolidated-validation-preservation.test.ts",
  },
  manage_material_instances: {
    source: "mcp/server/runtime/consolidatedTools.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/consolidated-validation-preservation.test.ts",
  },
  manage_render_profile: {
    source: "mcp/server/tools/render-profile.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/render-profile-binding.test.ts",
  },
  create_animation: {
    source: "mcp/server/tools/animation.ts",
    specialist: ANIMATION_PATH,
    test_owner: "mcp/tests/create-animation-contract.test.ts",
  },
  inspect_animation: {
    source: "mcp/server/tools/animation-inspection.ts",
    specialist: ANIMATION_PATH,
    test_owner: "mcp/tests/animation-native-intelligence.test.ts",
  },
  manage_animation_timeline: {
    source: "mcp/server/runtime/consolidatedTools.ts",
    specialist: ANIMATION_PATH,
    test_owner: "mcp/tests/consolidated-validation-preservation.test.ts",
  },
  manage_animation_effects: {
    source: "mcp/server/tools/animation-effects.ts",
    specialist: ANIMATION_PATH,
    test_owner: "mcp/tests/animation-effect-mutation-contract.test.ts",
  },
  manage_animation_controller: {
    source: "mcp/server/tools/animation-controller.ts",
    specialist: ANIMATION_PATH,
    test_owner: "mcp/tests/animation-controller-mutation-contract.test.ts",
  },
  inspect_particle: {
    source: "mcp/server/tools/particle.ts",
    specialist: ANIMATION_PATH,
    test_owner: "mcp/tests/particle-tool-contract.test.ts",
  },
  manage_particle: {
    source: "mcp/server/tools/particle.ts",
    specialist: ANIMATION_PATH,
    test_owner: "mcp/tests/particle-tool-contract.test.ts",
  },
  switch_authoring_phase: {
    source: "mcp/server/runtime/phaseControl.ts",
    specialist: null,
    test_owner: "mcp/tests/authoring-flow-simplification.test.ts",
  },
  get_project_info: {
    source: "mcp/server/tools/project.ts",
    specialist: null,
    test_owner: "mcp/tests/p1-core-ownership.test.ts",
  },
};

const DEFAULT_SOURCE_BY_DOMAIN: Record<ControlAuthoringDomain, ControlSourceOwner> = {
  GEOMETRY: {
    source: "mcp/server/runtime/registration.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/authoring-phase-surface.test.ts",
  },
  TEXTURING: {
    source: "mcp/server/runtime/registration.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/authoring-phase-surface.test.ts",
  },
  ANIMATION: {
    source: "mcp/server/runtime/registration.ts",
    specialist: ANIMATION_PATH,
    test_owner: "mcp/tests/authoring-phase-surface.test.ts",
  },
  CORE: {
    source: "mcp/server/runtime/registration.ts",
    specialist: null,
    test_owner: "mcp/tests/gateway-contract.test.ts",
  },
};

export function sourceOwnerForCapability(capability: string): ControlSourceOwner {
  return SOURCE_BY_CAPABILITY[capability] ?? DEFAULT_SOURCE_BY_DOMAIN[authoringDomainForCapability(capability)];
}
