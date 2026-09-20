import { describe, expect, test } from "bun:test";
import { evaluateCodexSessionPolicy } from "@/scripts/evaluate-codex-session-policy";

const base = {
  task_class: "DIRECT",
  pressure: "COMFORTABLE",
  milestone: "NONE",
  checkpoint_state: "FRESH",
  recovery_uncertainty: false,
  visual_verification_pending: false,
  routing_ambiguity: false,
  common_prefix_stable: true,
  stage_extension_stable: true,
  tool_action_pending: true,
  telemetry_available: false,
} as const;

describe("Codex session policy contract", () => {
  test("direct deterministic work stays un-compacted and may use economy reasoning", () => {
    const result = evaluateCodexSessionPolicy(base);
    expect(result).toMatchObject({
      proof_scope: "CLIENT_INTEGRATION_POLICY_ONLY",
      compaction: "KEEP_CONTEXT",
      cache: "REUSE_FULL_PREFIX",
      reasoning: "ECONOMY_WHEN_SUPPORTED",
      output: "MINIMAL_INTERMEDIATE",
      usage_claim_allowed: false,
    });
  });

  test("high pressure requires a fresh checkpoint before compaction", () => {
    const result = evaluateCodexSessionPolicy({
      ...base,
      pressure: "HIGH",
      checkpoint_state: "STALE",
    });
    expect(result.compaction).toBe("REQUIRE_FRESH_CHECKPOINT");
  });

  test("elevated pressure compacts only at a meaningful milestone", () => {
    expect(
      evaluateCodexSessionPolicy({
        ...base,
        pressure: "ELEVATED",
        milestone: "NONE",
      }).compaction
    ).toBe("KEEP_CONTEXT");

    expect(
      evaluateCodexSessionPolicy({
        ...base,
        pressure: "ELEVATED",
        milestone: "STAGE_COMPLETE",
      }).compaction
    ).toBe("COMPACT_NOW");
  });

  test("recovery uncertainty blocks ordinary compaction but remains recoverable under critical pressure with a fresh checkpoint", () => {
    expect(
      evaluateCodexSessionPolicy({
        ...base,
        pressure: "HIGH",
        recovery_uncertainty: true,
      }).compaction
    ).toBe("KEEP_CONTEXT");

    expect(
      evaluateCodexSessionPolicy({
        ...base,
        pressure: "CRITICAL",
        recovery_uncertainty: true,
      }).compaction
    ).toBe("COMPACT_NOW");
  });

  test("pending visual evidence delays non-critical compaction", () => {
    const result = evaluateCodexSessionPolicy({
      ...base,
      pressure: "HIGH",
      visual_verification_pending: true,
    });
    expect(result.compaction).toBe("KEEP_CONTEXT");
    expect(result.reasoning).toBe("QUALITY_FIRST");
  });

  test("stage changes preserve common-prefix reuse without pretending the full prefix is stable", () => {
    const result = evaluateCodexSessionPolicy({
      ...base,
      stage_extension_stable: false,
    });
    expect(result.cache).toBe("REUSE_COMMON_PREFIX");
  });

  test("common-prefix churn resets cache identity", () => {
    const result = evaluateCodexSessionPolicy({
      ...base,
      common_prefix_stable: false,
      stage_extension_stable: false,
    });
    expect(result.cache).toBe("RESET_PREFIX_IDENTITY");
  });

  test("complex reference work remains quality-first", () => {
    const result = evaluateCodexSessionPolicy({
      ...base,
      task_class: "FULL_REFERENCE_DRIVEN",
      tool_action_pending: false,
      telemetry_available: true,
    });
    expect(result.reasoning).toBe("QUALITY_FIRST");
    expect(result.output).toBe("NORMAL_USER_FACING");
    expect(result.usage_claim_allowed).toBe(true);
  });
});
