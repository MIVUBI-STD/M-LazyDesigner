export type SessionTaskClass =
  | "DIRECT"
  | "SCOPED_DISCOVERY"
  | "CONSTRUCTIVE_COMPONENT"
  | "TEXTURE_MATERIAL"
  | "ANIMATION"
  | "FULL_REFERENCE_DRIVEN";

export type SessionPressure =
  | "UNKNOWN"
  | "COMFORTABLE"
  | "ELEVATED"
  | "HIGH"
  | "CRITICAL";

export type SessionMilestone =
  | "NONE"
  | "CORRECTION_LOOP_COMPLETE"
  | "STAGE_COMPLETE"
  | "HANDOFF_READY"
  | "USER_REVIEW_READY";

export type CheckpointState = "MISSING" | "STALE" | "FRESH";

export type SessionPolicyInput = {
  task_class: SessionTaskClass;
  pressure: SessionPressure;
  milestone: SessionMilestone;
  checkpoint_state: CheckpointState;
  recovery_uncertainty: boolean;
  visual_verification_pending: boolean;
  routing_ambiguity: boolean;
  common_prefix_stable: boolean;
  stage_extension_stable: boolean;
  tool_action_pending: boolean;
  telemetry_available: boolean;
};

export type SessionCompactionDecision =
  | "KEEP_CONTEXT"
  | "REQUIRE_FRESH_CHECKPOINT"
  | "COMPACT_NOW";

export type SessionCacheDecision =
  | "REUSE_FULL_PREFIX"
  | "REUSE_COMMON_PREFIX"
  | "RESET_PREFIX_IDENTITY";

export type SessionReasoningHint =
  | "ECONOMY_WHEN_SUPPORTED"
  | "BALANCED"
  | "QUALITY_FIRST";

export type SessionOutputHint =
  | "MINIMAL_INTERMEDIATE"
  | "NORMAL_USER_FACING";

export type CodexSessionPolicyDecision = {
  schema: 1;
  proof_scope: "CLIENT_INTEGRATION_POLICY_ONLY";
  compaction: SessionCompactionDecision;
  cache: SessionCacheDecision;
  reasoning: SessionReasoningHint;
  output: SessionOutputHint;
  usage_claim_allowed: boolean;
  reasons: string[];
};

const MILESTONE_COMPACTION = new Set<SessionMilestone>([
  "CORRECTION_LOOP_COMPLETE",
  "STAGE_COMPLETE",
  "HANDOFF_READY",
  "USER_REVIEW_READY",
]);

function cacheDecision(
  commonStable: boolean,
  extensionStable: boolean
): SessionCacheDecision {
  if (!commonStable) return "RESET_PREFIX_IDENTITY";
  return extensionStable ? "REUSE_FULL_PREFIX" : "REUSE_COMMON_PREFIX";
}

function reasoningDecision(input: SessionPolicyInput): SessionReasoningHint {
  if (
    input.task_class === "DIRECT" &&
    !input.routing_ambiguity &&
    !input.visual_verification_pending &&
    !input.recovery_uncertainty
  ) {
    return "ECONOMY_WHEN_SUPPORTED";
  }

  if (
    input.task_class === "FULL_REFERENCE_DRIVEN" ||
    input.task_class === "ANIMATION" ||
    input.visual_verification_pending ||
    input.routing_ambiguity ||
    input.recovery_uncertainty
  ) {
    return "QUALITY_FIRST";
  }

  return "BALANCED";
}

function compactionDecision(
  input: SessionPolicyInput,
  reasons: string[]
): SessionCompactionDecision {
  if (input.pressure === "UNKNOWN" || input.pressure === "COMFORTABLE") {
    reasons.push("context pressure does not justify compaction");
    return "KEEP_CONTEXT";
  }

  if (input.recovery_uncertainty && input.pressure !== "CRITICAL") {
    reasons.push("recovery uncertainty stays expanded until pressure is critical");
    return "KEEP_CONTEXT";
  }

  const atMilestone = MILESTONE_COMPACTION.has(input.milestone);
  const pressureRequiresCompaction =
    input.pressure === "HIGH" || input.pressure === "CRITICAL";
  const elevatedMilestone =
    input.pressure === "ELEVATED" && atMilestone;

  if (!pressureRequiresCompaction && !elevatedMilestone) {
    reasons.push("elevated context without a meaningful milestone remains intact");
    return "KEEP_CONTEXT";
  }

  if (input.checkpoint_state !== "FRESH") {
    reasons.push("compaction requires a fresh LazyDesigner continuation checkpoint");
    return "REQUIRE_FRESH_CHECKPOINT";
  }

  if (input.visual_verification_pending && input.pressure !== "CRITICAL") {
    reasons.push("pending decision-changing visual evidence delays non-critical compaction");
    return "KEEP_CONTEXT";
  }

  reasons.push(
    input.pressure === "CRITICAL"
      ? "critical context pressure with a fresh checkpoint permits compaction"
      : "context pressure/milestone with a fresh checkpoint permits compaction"
  );
  return "COMPACT_NOW";
}

export function evaluateCodexSessionPolicy(
  input: SessionPolicyInput
): CodexSessionPolicyDecision {
  const reasons: string[] = [];
  const compaction = compactionDecision(input, reasons);
  const cache = cacheDecision(
    input.common_prefix_stable,
    input.stage_extension_stable
  );
  const reasoning = reasoningDecision(input);
  const output: SessionOutputHint = input.tool_action_pending
    ? "MINIMAL_INTERMEDIATE"
    : "NORMAL_USER_FACING";

  if (cache === "REUSE_COMMON_PREFIX") {
    reasons.push("stage extension changed while the cross-stage common prefix stayed stable");
  } else if (cache === "REUSE_FULL_PREFIX") {
    reasons.push("common prefix and stage extension are both stable");
  } else {
    reasons.push("common prefix changed; upstream cache identity must not be assumed reusable");
  }

  if (reasoning === "ECONOMY_WHEN_SUPPORTED") {
    reasons.push("deterministic direct task is eligible for lower reasoning effort when the client supports it");
  } else if (reasoning === "QUALITY_FIRST") {
    reasons.push("task ambiguity, visual/recovery evidence, or task class requires quality-first reasoning");
  }

  if (output === "MINIMAL_INTERMEDIATE") {
    reasons.push("another tool action is pending; intermediate prose should remain minimal");
  }

  if (!input.telemetry_available) {
    reasons.push("usage telemetry is unavailable; no token-saving claim is allowed");
  }

  return {
    schema: 1,
    proof_scope: "CLIENT_INTEGRATION_POLICY_ONLY",
    compaction,
    cache,
    reasoning,
    output,
    usage_claim_allowed: input.telemetry_available,
    reasons,
  };
}

async function main(): Promise<void> {
  const path = process.argv[2];
  if (!path) {
    throw new Error(
      "Usage: bun run eval:session-policy -- <session-policy-input.json>"
    );
  }
  const file = Bun.file(path);
  if (!(await file.exists())) throw new Error(`Policy input not found: ${path}`);
  const input = (await file.json()) as SessionPolicyInput;
  console.log(JSON.stringify(evaluateCodexSessionPolicy(input), null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
