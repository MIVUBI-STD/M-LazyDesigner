import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("LazyDesigner Control particle reference packet", () => {
  test("delivers asset kind and particle handoff metadata without adding a particle profile", async () => {
    const packetData = await source("gateway/control/packetData.ts");
    const referenceTypes = await source("gateway/control/referenceTypes.ts");

    expect(packetData).toContain('"asset_kind"');
    expect(packetData).toContain('"particle"');
    expect(packetData).toContain("asset_kind: reference.asset_kind");
    expect(packetData).toContain("particle: reference.particle");

    expect(referenceTypes).toContain(
      'export type ControlReferenceAssetKind = "MODEL" | "PARTICLE"'
    );
    const profileStart = referenceTypes.indexOf("export type ControlProfile =");
    const profileEnd = referenceTypes.indexOf(
      "export type ControlReferenceAssetKind",
      profileStart
    );
    expect(profileStart).toBeGreaterThanOrEqual(0);
    expect(profileEnd).toBeGreaterThan(profileStart);
    expect(referenceTypes.slice(profileStart, profileEnd)).not.toContain(
      '"PARTICLE"'
    );
  });
});
