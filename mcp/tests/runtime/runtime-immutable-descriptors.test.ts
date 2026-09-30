import { describe, expect, test } from "bun:test";
import {
  DEFAULT_MCP_REGISTRATION_PROFILE,
} from "@/lib/capabilities/registrationProfile";
import {
  getMcpSurfaceDescriptor,
  getMcpSurfaceToolNames,
} from "@/server/runtime/registration";
import {
  buildMcpServerInstructions,
} from "@/server/server";

describe("Runtime immutable descriptors", () => {
  test("reuses one frozen surface descriptor for the same profile and phase", () => {
    const first = getMcpSurfaceDescriptor(
      DEFAULT_MCP_REGISTRATION_PROFILE,
      "geometry"
    );
    const second = getMcpSurfaceDescriptor(
      DEFAULT_MCP_REGISTRATION_PROFILE,
      "geometry"
    );

    expect(second).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.toolNames)).toBe(true);
    expect(first.count).toBe(first.toolNames.length);
    expect(first.toolNames.every((name) => first.toolNameSet.has(name))).toBe(true);
    expect(
      getMcpSurfaceToolNames(DEFAULT_MCP_REGISTRATION_PROFILE, "geometry")
    ).toBe(first.toolNames);
  });

  test("reuses phase server instructions", () => {
    const first = buildMcpServerInstructions(
      "animation",
      DEFAULT_MCP_REGISTRATION_PROFILE
    );
    const second = buildMcpServerInstructions(
      "animation",
      DEFAULT_MCP_REGISTRATION_PROFILE
    );

    expect(second).toBe(first);
  });
});