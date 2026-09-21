export type NativeUvMode = "PER_FACE" | "BOX_UV";

export type BoxUvAutomationPolicy =
  | { mode: "PER_FACE"; automation: "ALLOWED" }
  | {
      mode: "BOX_UV";
      automation: "BLOCKED";
      reason: "EXPLICIT_CONVERSION_REQUIRED";
    };

export function semanticUvAutomationPolicy(boxUv: boolean): BoxUvAutomationPolicy {
  return boxUv
    ? {
        mode: "BOX_UV",
        automation: "BLOCKED",
        reason: "EXPLICIT_CONVERSION_REQUIRED",
      }
    : { mode: "PER_FACE", automation: "ALLOWED" };
}

export function requireSemanticUvAutomationAllowed(boxUv: boolean, label: string): void {
  const policy = semanticUvAutomationPolicy(boxUv);
  if (policy.automation === "BLOCKED") {
    throw new Error(
      label +
        " uses native Box UV. Semantic per-face UV automation will not convert Box UV implicitly; request an explicit Box-UV→per-face conversion workflow first."
    );
  }
}
