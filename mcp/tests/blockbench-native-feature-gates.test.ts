import { describe, expect, test } from "bun:test";
import {
  supportsNativeIkControllerLinks,
  supportsNativeTextureFlatten,
} from "@/lib/blockbench/nativeFeatureGates";

describe("Blockbench native feature probes", () => {
  test("IK native links are available only when both properties exist", () => {
    expect(supportsNativeIkControllerLinks(null)).toBe(false);
    expect(supportsNativeIkControllerLinks(undefined)).toBe(false);
    expect(supportsNativeIkControllerLinks({ ik_source: "" })).toBe(false);
    expect(supportsNativeIkControllerLinks({ ik_pole: "" })).toBe(false);
    expect(supportsNativeIkControllerLinks({ ik_source: undefined, ik_pole: null })).toBe(true);
    expect(supportsNativeIkControllerLinks({ ik_source: "", ik_pole: "", next_release_field: true })).toBe(true);
  });

  test("texture flatten is guarded by actual native callable behavior", () => {
    expect(supportsNativeTextureFlatten(null)).toBe(false);
    expect(supportsNativeTextureFlatten({ flatten: true })).toBe(false);
    expect(supportsNativeTextureFlatten({ flatten: () => undefined })).toBe(true);
    expect(supportsNativeTextureFlatten(Object.create({ flatten() {} }))).toBe(true);
    expect(supportsNativeTextureFlatten({ layers: [] })).toBe(false);
  });

  test("missing one specialized API must not disable a separate operation", () => {
    const futureIkProperties = { ik_source: "" }; // ik_pole removed upstream
    const texture = { flatten() {} };
    expect(supportsNativeIkControllerLinks(futureIkProperties)).toBe(false);
    expect(supportsNativeTextureFlatten(texture)).toBe(true);
  });
});
