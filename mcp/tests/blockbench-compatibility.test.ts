import { describe, expect, test } from "bun:test";
import {
  BLOCKBENCH_MIN_VERSION,
  evaluateBlockbenchCompatibility,
} from "@/lib/blockbenchCompatibility";

describe("Blockbench compatibility policy", () => {
  test("exposes the installation minimum from the canonical manifest", () => {
    expect(BLOCKBENCH_MIN_VERSION).toBe("5.1.0");
  });

  test("marks the current live-tested version as validated", () => {
    expect(evaluateBlockbenchCompatibility("5.2.0")).toMatchObject({
      status: "validated",
      liveValidated: true,
    });
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
