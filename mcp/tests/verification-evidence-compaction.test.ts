import { describe, expect, test } from "bun:test";
import { compileVerificationEvidenceRequests, type VerificationEvidenceRequest } from "@/lib/orchestration/evidencePlan";
import { VerificationEvidenceRegistry } from "@/lib/orchestration/evidenceRegistry";
import {
  compactVerificationEvidence,
  diagnoseMinecraftDiscrepancy,
  minecraftQualityFocus,
  prioritizeMinecraftDiscrepancies,
  type VerificationDiscrepancy,
} from "@/lib/orchestration/compactEvidence";
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
        verification_risk: "LOW",
        views: ["front"],
        views_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
        size: 256,
        size_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
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
    const request: VerificationEvidenceRequest = {
      domain: "GEOMETRY",
      source: "capture_model_views",
      verification_risk: "LOW",
      views: ["front"],
      views_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
      size: 256,
      size_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
      scope_instance_ids: ["arm:0"],
    };
    const result = { png_data_url: "data:image/png;base64," + "x".repeat(5000) };
    const handle = registry.put({ request, result });
    const discrepancies: VerificationDiscrepancy[] = Array.from(
      { length: 10 },
      (_, index) => ({
        code: "D" + index,
        severity: index === 9 ? "BLOCKING" : "REVIEW",
        summary: "issue " + index,
        views: index === 0 ? ["front"] : undefined,
        evidence_targets: index === 0 ? ["width"] : undefined,
      })
    );
    const compact = compactVerificationEvidence(request, handle, discrepancies);

    expect(compact.state).toBe("BLOCKED");
    expect(compact.discrepancy_count).toBe(10);
    expect(compact.discrepancies).toHaveLength(6);
    expect(compact.discrepancies[0]).toMatchObject({
      views: ["front"],
      evidence_targets: ["width"],
    });
    expect(JSON.stringify(compact)).not.toContain("base64");
    expect(registry.get(handle).result).toEqual(result);
  });

  test("Minecraft quality critic prioritizes explicit structural causes without guessing from prose", () => {
    const discrepancies: VerificationDiscrepancy[] = [
      {
        code: "DETAIL",
        severity: "REVIEW",
        summary: "small decorative difference",
        quality_class: "SECONDARY_DETAIL",
        owner: "GEOMETRY",
      },
      {
        code: "LEG_MISSING",
        severity: "REVIEW",
        summary: "required leg absent in the approved reference comparison",
        quality_class: "REQUIRED_PART",
        owner: "GEOMETRY",
        cause_family: "MISSING_REQUIRED_PART",
        views: ["front", "left"],
        evidence_targets: ["silhouette"],
      },
      {
        code: "FREE_TEXT_ONLY",
        severity: "REVIEW",
        summary: "looks like something may be wrong",
      },
    ];

    const prioritized = prioritizeMinecraftDiscrepancies(discrepancies);
    expect(prioritized.map((item) => item.code)).toEqual([
      "LEG_MISSING",
      "DETAIL",
      "FREE_TEXT_ONLY",
    ]);
    expect(minecraftQualityFocus(discrepancies)).toEqual({
      code: "LEG_MISSING",
      severity: "REVIEW",
      quality_class: "REQUIRED_PART",
      owner: "GEOMETRY",
      cause_family: "MISSING_REQUIRED_PART",
      repair_route: "ADD_MASS",
      evidence_backed_cause: true,
      views: ["front", "left"],
      evidence_targets: ["silhouette"],
    });
  });

  test("blocking severity still outranks lower-severity structural category", () => {
    const prioritized = prioritizeMinecraftDiscrepancies([
      {
        code: "REQUIRED_REVIEW",
        severity: "REVIEW",
        summary: "required part mismatch",
        quality_class: "REQUIRED_PART",
        owner: "GEOMETRY",
      },
      {
        code: "UNCLASSIFIED_BLOCKER",
        severity: "BLOCKING",
        summary: "explicit blocker from evidence producer",
      },
    ]);
    expect(prioritized.map((item) => item.code)).toEqual([
      "UNCLASSIFIED_BLOCKER",
      "REQUIRED_REVIEW",
    ]);
    expect(minecraftQualityFocus(prioritized)?.quality_class).toBe(
      "UNCLASSIFIED"
    );
    expect(minecraftQualityFocus(prioritized)?.owner).toBe("UNKNOWN");
    expect(minecraftQualityFocus(prioritized)?.repair_route).toBe(
      "MORE_EVIDENCE"
    );
  });

  test("causal diagnosis maps only explicit evidence-backed causes to repair routes", () => {
    expect(
      diagnoseMinecraftDiscrepancy({
        code: "TORSO_WIDE",
        severity: "REVIEW",
        summary: "torso width differs from reference",
        quality_class: "PRIMARY_FORM",
        owner: "GEOMETRY",
        cause_family: "SIZE_MISMATCH",
      })
    ).toEqual({
      evidence_backed: true,
      owner: "GEOMETRY",
      cause_family: "SIZE_MISMATCH",
      repair_route: "RESIZE",
      needs_more_evidence: false,
    });

    expect(
      diagnoseMinecraftDiscrepancy({
        code: "AMBIGUOUS",
        severity: "REVIEW",
        summary: "leg looks wrong",
      })
    ).toEqual({
      evidence_backed: false,
      owner: "UNKNOWN",
      cause_family: "UNKNOWN",
      repair_route: "MORE_EVIDENCE",
      needs_more_evidence: true,
    });
  });

  test("evidence invalidation and runtime clear make stale handles fail closed", () => {
    const registry = new VerificationEvidenceRegistry();
    const request: VerificationEvidenceRequest = {
      domain: "GEOMETRY",
      source: "capture_model_views",
      verification_risk: "LOW",
      views: ["front"],
      views_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
      size: 256,
      size_role: "FALLBACK_IF_NO_GROUNDED_TARGETS",
      scope_instance_ids: ["arm:0"],
    };

    const first = registry.put({ request, result: { revision: 1 } });
    expect(registry.invalidate(first)).toBe(true);
    expect(() => registry.get(first)).toThrow("VERIFICATION_EVIDENCE_NOT_FOUND");

    const second = registry.put({ request, result: { revision: 2 } });
    registry.clear();
    expect(registry.size()).toBe(0);
    expect(() => registry.get(second)).toThrow("VERIFICATION_EVIDENCE_NOT_FOUND");
  });
});
