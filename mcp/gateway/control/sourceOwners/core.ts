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
};
