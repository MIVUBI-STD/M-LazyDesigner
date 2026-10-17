import { describe, expect, test } from "bun:test";
import { mkdtemp, rename, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileMetadataSignature } from "./fileSignature";
import { readReferenceFactPage, readReferencePackageProjection } from "./referencePackage";

describe("Control Reference Package cache freshness", () => {
  test("reads the omitted 25th part and full nested fields from the pinned source", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lazydesigner-fact-page-"));
    const file = join(dir, "REFERENCE.json");
    try {
      const doc = {
        schema: "lazydesigner-reference-v1",
        parts: Array.from({ length: 25 }, (_, i) => ({
          id: `part_${i}`,
          ...(i === 24 ? {
            required_detail: "rear attachment",
            related_parts: Array.from({ length: 13 }, (_, k) => `link_${k}`),
          } : {}),
        })),
      };
      await writeFile(file, JSON.stringify(doc));
      const projection = await readReferencePackageProjection(dir);
      expect(projection.semantic_facts?.parts).toHaveLength(24);
      const last = await readReferenceFactPage(dir, {
        section: "parts", offset: 24, limit: 1,
        expectedFingerprint: projection.fingerprint!,
      });
      expect(last.total_count).toBe(25);
      expect(last.returned_count).toBe(1);
      expect(last.has_more).toBe(false);
      expect(last.items[0]).toMatchObject({
        id: "part_24", required_detail: "rear attachment",
        related_parts: Array.from({ length: 13 }, (_, k) => `link_${k}`),
      });
      await expect(readReferenceFactPage(dir, {
        section: "parts", offset: 24, limit: 1,
        expectedFingerprint: "0".repeat(64),
      })).rejects.toThrow("REFERENCE_FACT_REVISION_CHANGED");
      const changed = { ...doc, parts: doc.parts.map((part, i) =>
        i === 24 ? { ...part, required_detail: "new rear attachment" } : part
      ) };
      await writeFile(file, JSON.stringify(changed));
      await expect(readReferenceFactPage(dir, {
        section: "parts", offset: 24, limit: 1,
        expectedFingerprint: projection.fingerprint!,
      })).rejects.toThrow("REFERENCE_FACT_REVISION_CHANGED");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("rejects oversized fact pages rather than silently clipping data", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lazydesigner-fact-limit-"));
    try {
      await writeFile(join(dir, "REFERENCE.json"), JSON.stringify({
        schema: "lazydesigner-reference-v1",
        parts: [{ id: "body", description: "x".repeat(18000) }],
      }));
      const projection = await readReferencePackageProjection(dir);
      await expect(readReferenceFactPage(dir, {
        section: "parts", offset: 0, limit: 1,
        expectedFingerprint: projection.fingerprint!,
      })).rejects.toThrow("REFERENCE_FACT_PAGE_TOO_LARGE");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

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
