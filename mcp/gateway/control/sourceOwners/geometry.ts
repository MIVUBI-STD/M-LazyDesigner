import type { ControlSourceOwner } from "../types";
import { MODELLING_PATH } from "../contexts";

export const GEOMETRY_SOURCE_OWNERS: Record<string, ControlSourceOwner> = {

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
  bone_rigging: {
    source: "mcp/server/tools/animation-rigging.ts",
    specialist: MODELLING_PATH,
    test_owner: "mcp/tests/blockbench-52-native-adoption.test.ts",
  },
};
