/** Type boundary for the import-safe runtime preflight; untrusted requests are validated dynamically. */
export type PreflightDecision = "allow" | "ask" | "deny";
export type PreflightVerdict = {
  decision: PreflightDecision;
  reason: string;
};
export declare function evaluatePreflight(request: unknown): PreflightVerdict;
