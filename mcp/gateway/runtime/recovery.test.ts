import { describe, expect, test } from "bun:test";
import { recoveryForGatewayError } from "./recovery";

describe("gateway recovery semantics", () => {
  test("marks interrupted mutations as uncertain and non-retriable", () => {
    expect(recoveryForGatewayError("OUTCOME_UNKNOWN", false)).toEqual({
      category: "TRANSPORT",
      safe_to_retry: false,
      state_uncertain: true,
      requires_status_refresh: true,
      requires_user_action: false,
      action: "inspect current Blockbench state before deciding whether to retry",
    });
  });

  test("requires explicit user action for lost project affinity", () => {
    const recovery = recoveryForGatewayError("PROJECT_CONTEXT_LOST", false, {
      action: "select intended tab",
    });
    expect(recovery.category).toBe("AFFINITY");
    expect(recovery.requires_user_action).toBe(true);
    expect(recovery.action).toBe("select intended tab");
  });

  test("keeps read-only transport interruption retryable", () => {
    const recovery = recoveryForGatewayError("BACKEND_CALL_INTERRUPTED", true);
    expect(recovery.safe_to_retry).toBe(true);
    expect(recovery.state_uncertain).toBe(false);
  });
});
