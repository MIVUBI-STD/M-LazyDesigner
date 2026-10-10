import { describe, expect, test } from "bun:test";
import {
  animationHandoffReadinessSchema,
  assertAnimationCheckpointCurrent,
  classifyAnimationHandoffReadiness,
  summarizeAnimationHandoffReadiness,
} from "@/lib/authoringReadiness";

describe("Animation handoff readiness gate", () => {
  test("distinguishes explicit user approval from autonomous verification", () => {
    const approved = animationHandoffReadinessSchema.parse({
      geometry_approved: true,
      uv_layout: "PASS",
      texture_approved: true,
      checkpoint: "C:/asset/checkpoint.bbmodel",
      no_blockers: true,
    });
    const autonomous = animationHandoffReadinessSchema.parse({
      autonomous_authorized: true,
      geometry_verified: true,
      uv_layout: "PASS",
      texture_verified: true,
      checkpoint: "C:/asset/checkpoint.bbmodel",
      evidence: "Current revision geometry and texture evidence verified.",
      no_blockers: true,
    });

    expect(classifyAnimationHandoffReadiness(approved)).toBe("USER_APPROVED");
    expect(classifyAnimationHandoffReadiness(autonomous)).toBe("AUTONOMOUS_VERIFIED");
    expect(summarizeAnimationHandoffReadiness(approved).user_approval_claim).toBe(true);
    expect(summarizeAnimationHandoffReadiness(autonomous).user_approval_claim).toBe(false);
    expect(summarizeAnimationHandoffReadiness(autonomous).evidence_present).toBe(true);
  });

  test("rejects incomplete readiness instead of inferring PASS", () => {
    expect(() => animationHandoffReadinessSchema.parse({
      geometry_approved: true,
      uv_layout: "PASS",
      checkpoint: "C:/asset/checkpoint.bbmodel",
      no_blockers: true,
    })).toThrow();

    expect(() => animationHandoffReadinessSchema.parse({
      autonomous_authorized: true,
      geometry_verified: true,
      uv_layout: "PASS",
      texture_verified: true,
      checkpoint: "C:/asset/checkpoint.bbmodel",
      evidence: "",
      no_blockers: true,
    })).toThrow();
  });
  test("rejects relative or non-bbmodel checkpoints at the Runtime boundary", () => {
    const readiness = animationHandoffReadinessSchema.parse({
      geometry_approved: true, uv_layout: "PASS", texture_approved: true,
      checkpoint: "C:/asset/current.bbmodel", no_blockers: true,
    });
    let reads = 0;
    for (const checkpoint of [
      "checkpoint", "relative.bbmodel", "/assets/out.geo.json", "C:/asset",
    ]) {
      // Existing public schema remains generator-stable; physical checkpoint
      // integrity is enforced by the native Runtime, not a new Zod surface.
      expect(() => assertAnimationCheckpointCurrent(
        { ...readiness, checkpoint },
        { save_path: "C:/asset/current.bbmodel", saved: true },
        "bedrock", () => { reads++; return { isFile: () => true, size: 120 }; }
      )).toThrow("ANIMATION_CHECKPOINT_MISMATCH");
    }
    expect(reads).toBe(0);
  });

  test("accepts an exact saved Bedrock project after just one file stat", () => {
    const readiness = animationHandoffReadinessSchema.parse({
      autonomous_authorized: true, geometry_verified: true, uv_layout: "PASS",
      texture_verified: true, checkpoint: "C:/Models/asset.bbmodel",
      evidence: "Current revision reviewed.", no_blockers: true,
    });
    let reads = 0;
    const stat = (_path: string) => {
      reads++;
      return { isFile: () => true, size: 120 };
    };
    assertAnimationCheckpointCurrent(
      readiness, { save_path: "c:\\models\\ASSET.bbmodel", saved: true },
      "bedrock", stat
    );
    expect(reads).toBe(1);
    for (const [project, format] of [
      [null, "bedrock"],
      [{ save_path: "C:/Models/asset.bbmodel", saved: false }, "bedrock"],
      [{ save_path: "C:/Models/other.bbmodel", saved: true }, "bedrock"],
      [{ save_path: "C:/Models/asset.bbmodel", saved: true }, "java_block"],
    ] as const) {
      expect(() => assertAnimationCheckpointCurrent(readiness, project, format, stat))
        .toThrow("ANIMATION_CHECKPOINT_");
    }
    expect(reads).toBe(1);
  });

  test("fails closed on missing, empty and non-file checkpoints", () => {
    const readiness = animationHandoffReadinessSchema.parse({
      geometry_approved: true, uv_layout: "PASS", texture_approved: true,
      checkpoint: "/models/current.bbmodel", no_blockers: true,
    });
    const active = { save_path: "/models/current.bbmodel", saved: true };
    expect(() => assertAnimationCheckpointCurrent(readiness, active, "bedrock", () => {
      throw new Error("ENOENT");
    })).toThrow("ANIMATION_CHECKPOINT_UNAVAILABLE");
    for (const info of [
      { isFile: () => true, size: 0 },
      { isFile: () => false, size: 100 },
    ]) {
      expect(() => assertAnimationCheckpointCurrent(readiness, active, "bedrock", () => info))
        .toThrow("ANIMATION_CHECKPOINT_INVALID");
    }
  });

  test("native check precedes phase transition without another public tool", async () => {
    const source = await Bun.file("server/runtime/phaseControl.ts").text();
    expect(source).toContain("assertAnimationCheckpointCurrent(");
    expect(source.indexOf("assertAnimationCheckpointCurrent("))
      .toBeLessThan(source.indexOf("requestMcpStageSwitch(target_phase);"));
  });

});
