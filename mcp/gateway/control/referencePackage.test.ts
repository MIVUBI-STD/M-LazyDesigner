import { describe, expect, test } from "bun:test";
import { mkdtemp, rename, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileMetadataSignature } from "./fileSignature";
import { readReferencePackageProjection } from "./referencePackage";

describe("Control Reference Package cache freshness", () => {
  test("same-size same-mtime replacement refreshes blocked reference readiness", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lazydesigner-ref-cache-"));
    const file = join(dir, "REFERENCE.json");
    const replacement = join(dir, "replacement.json");
    const when = new Date("2024-01-01T00:00:00.000Z");
    const body = (geometry: string, intent: string) => JSON.stringify({
      schema: "lazydesigner-reference-v1",
      asset: { name: "Chair", kind: "MODEL", intent },
      readiness: { geometry },
    });
    try {
      const before = body("READY", "build model");
      const after = body("BLOCKED", "build mod");
      expect(Buffer.byteLength(before)).toBe(Buffer.byteLength(after));
      await writeFile(file, before);
      await utimes(file, when, when);
      const firstStat = await stat(file);
      const first = await readReferencePackageProjection(dir);
      expect(first.available).toBe(true);
      expect(first.readiness.geometry).toBe("READY");
      expect((await readReferencePackageProjection(dir)).fingerprint).toBe(first.fingerprint);

      await writeFile(replacement, after);
      await utimes(replacement, when, when);
      await rename(replacement, file);
      const secondStat = await stat(file);
      expect(secondStat.size).toBe(firstStat.size);
      expect(secondStat.mtimeMs).toBe(firstStat.mtimeMs);
      expect(fileMetadataSignature(secondStat)).not.toBe(fileMetadataSignature(firstStat));

      const second = await readReferencePackageProjection(dir);
      expect(second.available).toBe(true);
      expect(second.readiness.geometry).toBe("BLOCKED");
      expect(second.fingerprint).not.toBe(first.fingerprint);
      expect((await readReferencePackageProjection(dir)).fingerprint).toBe(second.fingerprint);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
