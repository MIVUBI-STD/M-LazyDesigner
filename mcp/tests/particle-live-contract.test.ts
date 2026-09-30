import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  PARTICLE_LIVE_PROOF_KIND,
  PARTICLE_LIVE_REQUIRED_TOOLS,
  PARTICLE_LIVE_VISUAL_CLAIM,
} from "../scripts/verify/verify-particle-live";

describe("particle live verifier contract (source harness, not live proof)", () => {
  test("requires only the compact particle public surface and preserves proof boundaries", () => {
    expect(PARTICLE_LIVE_REQUIRED_TOOLS).toEqual([
      "inspect_particle",
      "manage_particle",
    ]);
    expect(PARTICLE_LIVE_PROOF_KIND).toBe("live_particle_native_preview");
    expect(PARTICLE_LIVE_VISUAL_CLAIM).toBe("not_evaluated");
  });

  test("prebuilds one math-driven create-patch-save-preview path", () => {
    const source = readFileSync(
      new URL("../scripts/verify/verify-particle-live.ts", import.meta.url),
      "utf8"
    );
    expect(source).toContain("minecraft:particle_motion_parametric");
    expect(source).toContain("math.sin(variable.particle_age");
    expect(source).not.toContain("client_entity_binding");
    expect(source).not.toContain("client_entity_path");
    expect(source).toContain("one_call_create_patch_save_preview");
    expect(source).toContain("preview: true");
    expect(source).toContain("visual_quality: PARTICLE_LIVE_VISUAL_CLAIM");
  });

  test("package exposes the explicit particle live command", () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8")
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.["verify:particle-live"]).toBe(
      "bun run ./scripts/verify/verify-particle-live.ts"
    );
  });
});