import type { VerificationTask } from "@/lib/orchestration/verificationPlan";
import type { VerificationRisk } from "@/lib/orchestration/deltaVerification";
import type { ModelView } from "@/server/tools/camera";

export type VerificationEvidenceRequest =
  | {
      domain: "GEOMETRY";
      source: "capture_model_views";
      views: ModelView[];
      size: 256 | 512;
      scope_instance_ids: string[];
    }
  | {
      domain: "UV";
      source: "manage_uv_layout";
      island_ids: string[];
      full_replan: boolean;
    }
  | {
      domain: "RIG";
      source: "inspect_elements";
      instance_ids: string[];
      full_replan: boolean;
    }
  | {
      domain: "ANIMATION";
      source: "inspect_animation";
      instance_ids: string[];
      full_review: boolean;
    }
  | {
      domain: "TEXTURE";
      source: "get_texture";
      mode: "AFFECTED_SURFACES" | "SEMANTIC_REVIEW";
      inspection: "region" | "full_atlas";
    };

function geometryViews(risk: VerificationRisk): ModelView[] {
  if (risk === "LOW") return ["front"];
  if (risk === "MEDIUM") return ["front", "left"];
  return ["front", "left", "front_left_3q"];
}

export function compileVerificationEvidenceRequests(
  tasks: readonly VerificationTask[],
  risk: VerificationRisk
): VerificationEvidenceRequest[] {
  return tasks.map((task): VerificationEvidenceRequest => {
    switch (task.domain) {
      case "GEOMETRY":
        return {
          domain: "GEOMETRY",
          source: "capture_model_views",
          views: geometryViews(risk),
          size: risk === "HIGH" ? 512 : 256,
          scope_instance_ids: [...task.instance_ids],
        };
      case "UV":
        return {
          domain: "UV",
          source: "manage_uv_layout",
          island_ids: [...task.island_ids],
          full_replan: task.full_replan,
        };
      case "RIG":
        return {
          domain: "RIG",
          source: "inspect_elements",
          instance_ids: [...task.instance_ids],
          full_replan: task.full_replan,
        };
      case "ANIMATION":
        return {
          domain: "ANIMATION",
          source: "inspect_animation",
          instance_ids: [...task.instance_ids],
          full_review: task.full_review,
        };
      case "TEXTURE":
        return {
          domain: "TEXTURE",
          source: "get_texture",
          mode: task.mode,
          inspection: task.mode === "AFFECTED_SURFACES" ? "region" : "full_atlas",
        };
    }
  });
}
