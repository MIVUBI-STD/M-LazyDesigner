import { describe, expect, test } from "bun:test";
import { evaluateCodexSessionPolicy } from "../scripts/evaluate/evaluate-codex-session-policy";

describe("Astra local-measurement preflight", () => {
  test("single entrypoint binds the canonical live fixtures without claiming live proof", async () => {
    const source = await Bun.file("scripts/verify/verify-astra-usage-ready.ts").text();
    const pkg = await Bun.file("package.json").json();

    expect(pkg.scripts["verify:astra-usage-ready"]).toBe(
      "bun run ./scripts/verify/verify-astra-usage-ready.ts"
    );
    expect(source).toContain("astra-live-golden-tasks.json");
    expect(source).toContain("astra-usage-validation-template.json");
    expect(source).toContain("codex-session-policy-input-template.json");
    expect(source).toContain("READY_FOR_LOCAL_MEASUREMENT");
    expect(source).toContain("REMOTE_GITHUB_PREP_ONLY");
    expect(source).toContain("token_claim_available_now: false");
    expect(source).toContain("never synthesize total_tokens from components");
    expect(source).toContain("record task_class and accepted_result");
    expect(source).toContain("unique model_events.event_id");
    expect(source).toContain("never double-count duplicated response/compaction events");
    expect(source).toContain("capture wall/accepted-result/model/tool latency");
    expect(source).toContain("never invent one aggregate efficiency score");
    expect(source).toContain("session_policy_template");
    expect(source).toContain("session_policy_command");
    expect(source).toContain("eval:session-policy");
    expect(pkg.scripts["eval:session-policy"]).toBe(
      "bun run ./scripts/evaluate/evaluate-codex-session-policy.ts"
    );
    expect(source).not.toContain("LIVE_BLOCKBENCH_PASS");

    // Validate actual policy data instead of only mentioning its filename.
    const template = await Bun.file(
      "tests/fixtures/codex-session-policy-input-template.json"
    ).json();
    expect(template.schema).toBe("lazydesigner-codex-session-policy-input-v1");
    expect(template.telemetry_available).toBe(false);
    expect(template.checkpoint_state).toBe("MISSING");
    expect(evaluateCodexSessionPolicy(template)).toMatchObject({
      proof_scope: "CLIENT_INTEGRATION_POLICY_ONLY",
      compaction: "KEEP_CONTEXT",
      usage_claim_allowed: false,
    });
  });
});