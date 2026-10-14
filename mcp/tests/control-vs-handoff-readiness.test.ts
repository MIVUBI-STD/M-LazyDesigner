import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

async function source(path: string): Promise<string> {
  return readFile(new URL(path, import.meta.url), "utf8");
}

describe("Control lifecycle readiness vs Runtime handoff authorization", () => {
  test("Control readiness remains workspace orientation, not phase authorization", async () => {
    const controlTest = await source("gateway-control-lifecycle-readiness.test.ts");
    expect(controlTest).toContain('packet.readiness.modelling_start).toBe("READY")');
    expect(controlTest).toContain("TEXTURE_APPROVAL_REQUIRED");
    expect(controlTest).not.toContain("checkpoint:");
    expect(controlTest).not.toContain("autonomous_authorized:");
  });

  test("Animation handoff still owns checkpoint and authorization proof", async () => {
    const [readiness, phaseControl] = await Promise.all([
      source("../lib/authoring/authoringReadiness.ts"),
      source("../server/runtime/phaseControl.ts"),
    ]);

    expect(readiness).toContain("checkpoint: z.string().min(1)");
    expect(readiness).toContain("autonomous_authorized: z.literal(true)");
    expect(readiness).toContain("evidence: z.string().min(1)");
    expect(phaseControl).toContain("animationHandoffReadinessSchema.optional()");
    expect(phaseControl).toContain('value.target_phase !== "animation" || value.readiness !== undefined');
  });
});
