import { summarizeAstraUsage } from "./validate-astra-usage";

const GOLDEN_PATH = "tests/fixtures/astra-live-golden-tasks.json";
const TEMPLATE_PATH = "tests/fixtures/astra-usage-validation-template.json";
const SESSION_POLICY_TEMPLATE_PATH =
  "tests/fixtures/codex-session-policy-input-template.json";

async function loadJson(path: string) {
  const file = Bun.file(path);
  if (!(await file.exists())) throw new Error(`Required Astra validation fixture is missing: ${path}`);
  return file.json();
}

async function main(): Promise<void> {
  const [golden, template, sessionPolicyTemplate] = await Promise.all([
    loadJson(GOLDEN_PATH),
    loadJson(TEMPLATE_PATH),
    loadJson(SESSION_POLICY_TEMPLATE_PATH),
  ]);

  if (golden.schema !== "lazydesigner-live-golden-tasks-v1") {
    throw new Error("Unexpected live Golden Task schema.");
  }
  if (golden.proof_scope !== "LIVE_BLOCKBENCH") {
    throw new Error("Golden Tasks must remain LIVE_BLOCKBENCH scoped.");
  }
  if (golden.quality_precedes_efficiency !== true) {
    throw new Error("Golden Tasks must require quality before efficiency.");
  }

  const expectedTaskIds = [
    "A_known_transform",
    "B_unknown_target_edit",
    "C_component_create",
    "D_texture_material_correction",
    "E_animation_correction",
    "F_reference_driven_asset",
  ];
  const actualTaskIds = Array.isArray(golden.tasks)
    ? golden.tasks.map((task: any) => task?.id)
    : [];
  if (JSON.stringify(actualTaskIds) !== JSON.stringify(expectedTaskIds)) {
    throw new Error("Golden Task A-F coverage drifted.");
  }

  if (
    sessionPolicyTemplate.schema !==
    "lazydesigner-codex-session-policy-input-v1"
  ) {
    throw new Error("Unexpected Codex session-policy input schema.");
  }

  const summary = summarizeAstraUsage(template);
  if (summary.aggregate.token_claim_available !== false) {
    throw new Error("Checked-in usage template must never claim measured token savings.");
  }

  console.log(
    JSON.stringify(
      {
        schema: 1,
        state: "READY_FOR_LOCAL_MEASUREMENT",
        proof_scope: "REMOTE_GITHUB_PREP_ONLY",
        golden_tasks: actualTaskIds,
        usage_template: TEMPLATE_PATH,
        validator_command:
          "bun run eval:astra-usage -- /absolute/path/to/astra-usage.json",
        session_policy_template: SESSION_POLICY_TEMPLATE_PATH,
        session_policy_command:
          "bun run eval:session-policy -- /absolute/path/to/session-policy-input.json",
        requirements: [
          "same exact source/build state for baseline and zero_waste pair",
          "quality PASS before usage comparison",
          "record only source-provided telemetry; unavailable fields stay null",
          "record task_class and accepted_result when the client/evaluator can identify them",
          "use unique model_events.event_id values when stable event identity is exposed; never double-count duplicated response/compaction events",
          "capture wall/accepted-result/model/tool latency, image inputs and tool-result bytes when the client exposes them",
          "keep performance dimensions separate; never invent one aggregate efficiency score",
          "never synthesize total_tokens from components",
          "session policy is advisory/client-owned and must not rewrite Codex model/settings configuration",
        ],
        token_claim_available_now: false,
      },
      null,
      2
    )
  );
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
