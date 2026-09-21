import type { ControlSourceOwner } from "../types";

export const CORE_SOURCE_OWNERS: Record<string, ControlSourceOwner> = {
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
  inspect_elements: {
    source: "mcp/server/runtime/consolidatedTools.ts",
    specialist: null,
    test_owner: "mcp/tests/consolidated-validation-preservation.test.ts",
  },
  list_locator_elements: {
    source: "mcp/server/tools/locators.ts",
    specialist: null,
    test_owner: "mcp/tests/bedrock-locator-coverage.test.ts",
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
};
