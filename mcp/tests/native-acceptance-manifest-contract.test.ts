import { describe, expect, test } from "bun:test";

const VERDICTS = new Set(["PASS", "FAIL", "UNVERIFIED"]);

describe("native acceptance manifest contract", () => {
  test("checked-in template cannot claim live proof", async () => {
    const manifest = await Bun.file("tests/fixtures/native-acceptance-manifest.json").json() as {
      schema: string;
      proof_scope: string;
      state: string;
      provenance: Record<string, unknown>;
      checks: Record<string, string>;
      policy: Record<string, unknown>;
    };

    expect(manifest.schema).toBe("lazydesigner-native-acceptance-v1");
    expect(manifest.proof_scope).toBe("LIVE_BLOCKBENCH");
    expect(manifest.state).toBe("UNVERIFIED");
    expect(Object.values(manifest.provenance).every((value) => value === null)).toBe(true);
    expect(Object.keys(manifest.checks).length).toBeGreaterThanOrEqual(10);
    for (const verdict of Object.values(manifest.checks)) {
      expect(VERDICTS.has(verdict)).toBe(true);
      expect(verdict).toBe("UNVERIFIED");
    }
    expect(manifest.policy.static_ci_rule).toContain("must not upgrade any native verdict");
    expect(manifest.policy.visual_rule).toContain("does not imply visual/reference acceptance");
  });
});
