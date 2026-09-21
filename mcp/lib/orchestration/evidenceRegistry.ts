import { createHash } from "node:crypto";
import type { VerificationEvidenceRequest } from "@/lib/orchestration/evidencePlan";

export type VerificationEvidenceRecord = {
  request: VerificationEvidenceRequest;
  result: unknown;
};

export type VerificationEvidenceHandle = `verificationevidence:${string}`;

export class VerificationEvidenceRegistry {
  private readonly entries = new Map<VerificationEvidenceHandle, VerificationEvidenceRecord>();

  constructor(private readonly maxEntries = 16) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > 64) {
      throw new Error("Verification evidence registry maxEntries must be 1..64.");
    }
  }

  put(record: VerificationEvidenceRecord): VerificationEvidenceHandle {
    const handle = (
      "verificationevidence:" +
      createHash("sha256").update(JSON.stringify(record)).digest("hex")
    ) as VerificationEvidenceHandle;
    this.entries.delete(handle);
    this.entries.set(handle, structuredClone(record));
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (!oldest) break;
      this.entries.delete(oldest);
    }
    return handle;
  }

  get(handle: VerificationEvidenceHandle): VerificationEvidenceRecord {
    const record = this.entries.get(handle);
    if (!record) {
      throw new Error(
        "VERIFICATION_EVIDENCE_NOT_FOUND: handle expired or belongs to a previous Runtime generation."
      );
    }
    this.entries.delete(handle);
    this.entries.set(handle, record);
    return structuredClone(record);
  }

  size(): number {
    return this.entries.size;
  }
}
