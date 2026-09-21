import type { ControlSourceOwner } from "../types";
import { ANIMATION_PATH } from "../contexts";

export const ANIMATION_SOURCE_OWNERS: Record<string, ControlSourceOwner> = {
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
};
