import { describe, expect, test } from "bun:test";
import {
  summarizeAstraUsage,
  validateAstraUsageDocument,
} from "@/scripts/validate-astra-usage";

describe("Astra usage validation contract", () => {
  test("checked-in template starts telemetry-unverified and cannot claim savings", async () => {
    const template = await Bun.file(
      "tests/fixtures/astra-usage-validation-template.json"
    ).json();

    expect(template.schema).toBe("lazydesigner-astra-usage-v1");
    expect(template.proof_scope).toBe("LOCAL_CODE_OR_LIVE_BLOCKBENCH");
    expect(template.source_sha).toBeNull();
    expect(template.model).toBeNull();
    expect(template.telemetry_source).toBeNull();

    const summary = summarizeAstraUsage(template);
    expect(summary.aggregate.measured_pairs).toBe(0);
    expect(summary.aggregate.token_claim_available).toBe(false);
    expect(summary.comparisons[0].comparison_state).toBe("UNAVAILABLE");
  });

  test("token comparison requires source-provided total tokens and PASS quality on both variants", () => {
    const doc = {
      schema: "lazydesigner-astra-usage-v1",
      proof_scope: "LIVE_BLOCKBENCH",
      source_sha: "abc",
      model: "Codex Astra",
      telemetry_source: "captured-client-telemetry",
      runs: [
        {
          task_id: "A_known_transform",
          variant: "baseline",
          quality_verdict: "PASS",
          task_success: true,
          user_corrections: 1,
          usage: {
            total_tokens: 1000,
            input_tokens: 800,
            cached_input_tokens: 100,
            output_tokens: 200,
            reasoning_tokens: null,
          },
          calls: { total: 4, search: 0, describe: 0, inspect: 2, mutate: 1, verify: 1, recovery: 0 },
        },
        {
          task_id: "A_known_transform",
          variant: "zero_waste",
          quality_verdict: "PASS",
          task_success: true,
          user_corrections: 1,
          usage: {
            total_tokens: 700,
            input_tokens: 550,
            cached_input_tokens: 100,
            output_tokens: 150,
            reasoning_tokens: null,
          },
          calls: { total: 2, search: 0, describe: 0, inspect: 0, mutate: 1, verify: 1, recovery: 0 },
        },
      ],
    } as any;

    const summary = summarizeAstraUsage(doc);
    expect(summary.comparisons[0]).toMatchObject({
      comparison_state: "MEASURED",
      token_claim_available: true,
      total_tokens: {
        baseline: 1000,
        zero_waste: 700,
        delta: 300,
        reduction_percent: 30,
      },
    });
  });

  test("components never synthesize a missing total token count", () => {
    const doc = {
      schema: "lazydesigner-astra-usage-v1",
      proof_scope: "LIVE_BLOCKBENCH",
      source_sha: "abc",
      model: "Codex Astra",
      telemetry_source: "captured-client-telemetry",
      runs: [
        {
          task_id: "A_known_transform",
          variant: "baseline",
          quality_verdict: "PASS",
          task_success: true,
          user_corrections: 0,
          usage: { total_tokens: null, input_tokens: 800, cached_input_tokens: 100, output_tokens: 200, reasoning_tokens: 50 },
          calls: { total: 2, search: 0, describe: 0, inspect: 0, mutate: 1, verify: 1, recovery: 0 },
        },
        {
          task_id: "A_known_transform",
          variant: "zero_waste",
          quality_verdict: "PASS",
          task_success: true,
          user_corrections: 0,
          usage: { total_tokens: null, input_tokens: 500, cached_input_tokens: 100, output_tokens: 150, reasoning_tokens: 25 },
          calls: { total: 2, search: 0, describe: 0, inspect: 0, mutate: 1, verify: 1, recovery: 0 },
        },
      ],
    } as any;

    const summary = summarizeAstraUsage(doc);
    expect(summary.comparisons[0].token_claim_available).toBe(false);
    expect(summary.aggregate.baseline_total_tokens).toBeNull();
  });

  test("negative or malformed usage is rejected", () => {
    expect(() =>
      validateAstraUsageDocument({
        schema: "lazydesigner-astra-usage-v1",
        proof_scope: "LIVE_BLOCKBENCH",
        source_sha: null,
        model: null,
        telemetry_source: null,
        runs: [
          {
            task_id: "A",
            variant: "baseline",
            quality_verdict: "UNVERIFIED",
            task_success: null,
            user_corrections: null,
            usage: { total_tokens: -1, input_tokens: null, cached_input_tokens: null, output_tokens: null, reasoning_tokens: null },
            calls: { total: null, search: null, describe: null, inspect: null, mutate: null, verify: null, recovery: null },
          },
        ],
      } as any)
    ).toThrow(/non-negative/);
  });

  test("live Golden manifest covers A-F and keeps quality before efficiency", async () => {
    const manifest = await Bun.file(
      "tests/fixtures/astra-live-golden-tasks.json"
    ).json();

    expect(manifest.schema).toBe("lazydesigner-live-golden-tasks-v1");
    expect(manifest.proof_scope).toBe("LIVE_BLOCKBENCH");
    expect(manifest.quality_precedes_efficiency).toBe(true);
    expect(manifest.aggregate_score).toBe(false);
    expect(manifest.tasks.map((task: any) => task.id)).toEqual([
      "A_known_transform",
      "B_unknown_target_edit",
      "C_component_create",
      "D_texture_material_correction",
      "E_animation_correction",
      "F_reference_driven_asset",
    ]);
  });
});
