import type { BackendTool } from "../protocol";

export type InterruptedCallClassification = {
  code: "BACKEND_CALL_INTERRUPTED" | "OUTCOME_UNKNOWN";
  safe_to_retry: boolean;
};

export function classifyInterruptedCall(
  tool: BackendTool
): InterruptedCallClassification {
  if (tool.annotations?.readOnlyHint === true) {
    return {
      code: "BACKEND_CALL_INTERRUPTED",
      safe_to_retry: true,
    };
  }
  return {
    code: "OUTCOME_UNKNOWN",
    safe_to_retry: false,
  };
}
