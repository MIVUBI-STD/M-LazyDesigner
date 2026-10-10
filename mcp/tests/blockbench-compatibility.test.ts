import { describe, expect, test } from "bun:test";
import {
  BLOCKBENCH_MIN_VERSION,
  evaluateBlockbenchCompatibility,
  matchesLiveValidatedBuild,
} from "@/lib/blockbenchCompatibility";

describe("Blockbench compatibility policy", () => {
  test("exposes the installation minimum from the canonical manifest", () => {
    expect(BLOCKBENCH_MIN_VERSION).toBe("5.1.0");
  });

  test("prior native success is historical, not validation of the current build", () => {
    for (const version of ["5.2.0", "5.2.1", "5.2.2"]) {
      expect(evaluateBlockbenchCompatibility(version)).toMatchObject({
        status: "compatible-unverified",
        liveValidated: false,
      });
      expect(evaluateBlockbenchCompatibility(version, "sha256:" + "a".repeat(64))
        .status).toBe("compatible-unverified");
    }
  });

  test("only an exact native-proven version and matching bundle identity qualify", () => {
    const build = "sha256:" + "a".repeat(64);
    const accepted = [{ version: "5.2.2", buildIdentity: build }];
    expect(matchesLiveValidatedBuild("5.2.2", build, accepted)).toBe(true);
    expect(matchesLiveValidatedBuild("5.2.0", build, accepted)).toBe(false);
    expect(matchesLiveValidatedBuild("5.2.2", "sha256:" + "b".repeat(64), accepted)).toBe(false);
    expect(matchesLiveValidatedBuild("5.2.2", null, accepted)).toBe(false);
    expect(matchesLiveValidatedBuild("5.2.2", "source", accepted)).toBe(false);
  });

  test("allows an in-family prerelease without pretending it was live-tested", () => {
    expect(evaluateBlockbenchCompatibility("5.2.0-beta.2")).toMatchObject({
      status: "compatible-unverified",
      liveValidated: false,
    });
  });

  test("blocks versions below the minimum", () => {
    expect(evaluateBlockbenchCompatibility("5.0.9").status).toBe("unsupported");
  });

  test("requires review for a future compatibility family", () => {
    expect(evaluateBlockbenchCompatibility("5.3.0").status).toBe("review-required");
  });

  test("fails closed on malformed version text", () => {
    expect(evaluateBlockbenchCompatibility("unknown").status).toBe("invalid");
  });
});
