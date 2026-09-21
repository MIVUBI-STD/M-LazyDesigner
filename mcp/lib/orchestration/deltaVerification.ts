import type { AuthoringImpactPlan } from "@/lib/orchestration/authoringImpact";
import {
  compileMinimalVerificationPlan,
  type VerificationTask,
} from "@/lib/orchestration/verificationPlan";
import {
  compileVerificationEvidenceRequests,
  type VerificationEvidenceRequest,
} from "@/lib/orchestration/evidencePlan";

export type VerificationRisk = "LOW" | "MEDIUM" | "HIGH";

export type DeltaVerificationPlan = {
  risk: VerificationRisk;
  tasks: VerificationTask[];
  required_task_count: number;
  advisory_budget: number;
  budget_state: "WITHIN_BUDGET" | "REQUIRED_OVER_BUDGET";
  evidence_requests: VerificationEvidenceRequest[];
};

function deriveRisk(impact: AuthoringImpactPlan): VerificationRisk {
  const fullSemantic =
    impact.uv.scope === "FULL_SEMANTIC_REPLAN" ||
    impact.rig.scope === "FULL_SEMANTIC_REPLAN" ||
    impact.animation.scope === "FULL_SEMANTIC_REVIEW" ||
    impact.texture.scope === "SEMANTIC_REVIEW";

  if (fullSemantic || impact.geometry.remove_instance_ids.length > 0) return "HIGH";

  const changedDomains = [
    impact.geometry.upsert_instance_ids.length > 0,
    impact.uv.scope !== "UNCHANGED",
    impact.rig.scope !== "UNCHANGED",
    impact.animation.scope !== "UNCHANGED",
    impact.texture.scope !== "UNCHANGED",
  ].filter(Boolean).length;

  return changedDomains <= 2 ? "LOW" : "MEDIUM";
}

function advisoryBudget(risk: VerificationRisk): number {
  if (risk === "LOW") return 2;
  if (risk === "MEDIUM") return 4;
  return 6;
}

export function compileDeltaVerificationPlan(
  impact: AuthoringImpactPlan
): DeltaVerificationPlan {
  const tasks = compileMinimalVerificationPlan(impact);
  const risk = deriveRisk(impact);
  const budget = advisoryBudget(risk);

  return {
    risk,
    tasks,
    required_task_count: tasks.length,
    advisory_budget: budget,
    budget_state:
      tasks.length <= budget ? "WITHIN_BUDGET" : "REQUIRED_OVER_BUDGET",
    evidence_requests: compileVerificationEvidenceRequests(tasks, risk),
  };
}