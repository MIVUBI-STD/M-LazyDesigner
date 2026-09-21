import { describe, expect, test } from "bun:test";
import { compileVerificationEvidenceRequests } from "@/lib/orchestration/evidencePlan";
import { VerificationEvidenceRegistry } from "@/lib/orchestration/evidenceRegistry";
import { compactVerificationEvidence } from "@/lib/orchestration/compactEvidence";
import type { VerificationTask } from "@/lib/orchestration/verificationPlan";

describe("verification evidence compaction", () => {
  test("low-risk geometry verification requests one focused 256 view", () => {
    const tasks: VerificationTask[] = [
      { domain: "GEOMETRY", kind: "CUBE_SCOPE", instance_ids: ["arm:0"] },
    ];
    const requests = compileVerificationEvidenceRequests(tasks, "LOW");
    expect(requests).toEqual([
      {
        domain: "GEOMETRY",
        source: "capture_model_views",
        views: ["front"],
        size: 256,
        scope_instance_ids: ["arm:0"],
      },
    ]);
  });

  test("affected texture verification stays region-scoped", () => {
    const tasks: VerificationTask[] = [
      { domain: "TEXTURE", kind: "TEXTURE_SCOPE", mode: "AFFECTED_SURFACES" },
    ];
    const requests = compileVerificationEvidenceRequests(tasks, "MEDIUM");
    expect(requests[0]).toEqual({
      domain: "TEXTURE",
      source: "get_texture",
      mode: "AFFECTED_SURFACES",
      inspection: "region",
    });
  });

  test("full evidence remains local while model-facing discrepancy output stays bounded", () => {
    const registry = new VerificationEvidenceRegistry();
    const request = {
      domain: "GEOMETRY" as const,
      source: "capture_model_views" as const,
      views: ["front"] as const,
      size: 256 as const,
      scope_instance_ids: ["arm:0"],
    };
    const result = { png_data_url: "data:image/png;base64," + "x".repeat(5000) };
    const handle = registry.put({ request, result });
    const discrepancies = Array.from({ length: 10 }, (_, index) => ({
      code: "D" + index,
      severity: index === 9 ? ("BLOCKING" as const) : ("REVIEW" as const),
      summary: "issue " + index,
    }));
    const compact = compactVerificationEvidence(request, handle, discrepancies);

    expect(compact.state).toBe("BLOCKED");
    expect(compact.discrepancy_count).toBe(10);
    expect(compact.discrepancies).toHaveLength(6);
    expect(JSON.stringify(compact)).not.toContain("base64");
    expect(registry.get(handle).result).toEqual(result);
  });
});
