import type { ControlAuthoringDomain, ControlSourceOwner } from "./types";
import {
  MODELLING_PATH,
  TEXTURING_PATH,
  ANIMATION_PATH,
} from "./contexts";
import { getControlCapabilityProjection } from "./capabilityProjection";

const SOURCE_BY_CAPABILITY: Record<string, ControlSourceOwner> = {
  manage_cubes: {
    source: "mcp/server/tools/cubes.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/model-effectiveness-correction-accuracy.test.ts",
  },
  add_group: {
    source: "mcp/server/tools/element-hierarchy.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/p1-core-ownership.test.ts",
  },
  modify_group: {
    source: "mcp/server/tools/element-hierarchy.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/model-effectiveness-correction-accuracy.test.ts",
  },
  duplicate_element: {
    source: "mcp/server/tools/element-mutation.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/generic-semantics-contract.test.ts",
  },
  reparent_element: {
    source: "mcp/server/tools/element-hierarchy.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/p1-core-ownership.test.ts",
  },
  remove_element: {
    source: "mcp/server/tools/element-mutation.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/p1-core-ownership.test.ts",
  },
  rename_element: {
    source: "mcp/server/tools/element-mutation.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/batch-group-rename.test.ts",
  },
  select_all_of_type: {
    source: "mcp/server/tools/element-discovery.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/p1-core-ownership.test.ts",
  },
  get_selection: {
    source: "mcp/server/tools/element-discovery.ts",
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
    source: "mcp/server/tools/animation-rigging.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/blockbench-52-native-adoption.test.ts",
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
    source: "mcp/server/tools/texture-create.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/authoring/asset-authoring-usage-slimming.test.ts",
  },
  list_textures: {
    source: "mcp/server/tools/texture-read.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-authoring-contract.test.ts",
  },
  get_texture: {
    source: "mcp/server/tools/texture-read.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-authoring-contract.test.ts",
  },
  activate_texture: {
    source: "mcp/server/tools/texture-assignment.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-module-ownership.test.ts",
  },
  add_texture_group: {
    source: "mcp/server/tools/texture-assignment.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/pbr-channel-contract.test.ts",
  },
  list_materials: {
    source: "mcp/server/tools/texture-materials.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-authoring-contract.test.ts",
  },
  get_material_info: {
    source: "mcp/server/tools/texture-materials.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-authoring-contract.test.ts",
  },
  import_texture_set: {
    source: "mcp/server/tools/texture-materials.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-authoring-contract.test.ts",
  },
  paint_fill_tool: {
    source: "mcp/server/tools/paint-primitives.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  draw_shape_tool: {
    source: "mcp/server/tools/paint-primitives.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  gradient_tool: {
    source: "mcp/server/tools/paint-primitives.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  color_picker_tool: {
    source: "mcp/server/tools/paint-primitives.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  copy_brush_tool: {
    source: "mcp/server/tools/paint-primitives.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  paint_settings: {
    source: "mcp/server/tools/paint-settings.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  paint_with_brush: {
    source: "mcp/server/tools/paint-brush.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-stroke.test.ts",
  },
  eraser_tool: {
    source: "mcp/server/tools/paint-brush.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  create_brush_preset: {
    source: "mcp/server/tools/paint-brush.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  load_brush_preset: {
    source: "mcp/server/tools/paint-brush.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  texture_selection: {
    source: "mcp/server/tools/paint-selection-layers.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  texture_layer_management: {
    source: "mcp/server/tools/paint-selection-layers.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/paint-tool-selection.test.ts",
  },
  paint_texture_transaction: {
    source: "mcp/server/tools/paint-texture-transaction.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/texture-runtime-live-contract.test.ts",
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
  manage_uv_layout: {
    source: "mcp/server/runtime/uvLayoutService.ts",
    specialist: TEXTURING_PATH,
    test_owner: "mcp/tests/uv-registration-readiness.test.ts",
  },
  create_animation: {
    source: "mcp/server/tools/animation-create.ts",
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


export function authoringDomainForCapability(
  capability: string
): ControlAuthoringDomain {
  return getControlCapabilityProjection(capability).authoringDomain;
}

export function sourceOwnerForCapability(capability: string): ControlSourceOwner {
  return SOURCE_BY_CAPABILITY[capability] ?? DEFAULT_SOURCE_BY_DOMAIN[authoringDomainForCapability(capability)];
}
