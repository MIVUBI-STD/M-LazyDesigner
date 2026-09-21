import { describe, expect, test } from "bun:test";
import {
  semanticUvAutomationPolicy,
  requireSemanticUvAutomationAllowed,
} from "@/lib/uv/boxUvPolicy";

describe("semantic UV Box-UV policy", () => {
  test("never treats Box UV as implicit per-face input", () => {
    expect(semanticUvAutomationPolicy(true)).toEqual({
      mode: "BOX_UV",
      automation: "BLOCKED",
      reason: "EXPLICIT_CONVERSION_REQUIRED",
    });
    expect(() => requireSemanticUvAutomationAllowed(true, "Cube demo")).toThrow(
      "explicit Box-UV→per-face conversion"
    );
  });

  test("permits already independent per-face UV", () => {
    expect(semanticUvAutomationPolicy(false)).toEqual({
      mode: "PER_FACE",
      automation: "ALLOWED",
    });
  });
});
