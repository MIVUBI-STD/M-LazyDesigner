import { createHash } from "node:crypto";
import type { VerificationEvidenceRequest } from "@/lib/orchestration/evidencePlan";

export type VerificationEvidenceRecord = {
  request: VerificationEvidenceRequest;
  result: unknown;
};

export type VerificationEvidenceHandle = `verificationevidence:${string}`;

export class VerificationEvidenceRegistry {
  private readonly entries = new Map<VerificationEvidenceHandle, VerificationEvidenceRecord>();
  private scopeIdentity = "unbound:0";

  constructor(private readonly maxEntries = 16) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > 64) {
      throw new Error("Verification evidence registry maxEntries must be 1..64.");
    }
  }

  put(record: VerificationEvidenceRecord): VerificationEvidenceHandle {
    const handle = (
      "verificationevidence:" +
      createHash("sha256")
        .update(this.scopeIdentity)
        .update("\n")
        .update(JSON.stringify(record))
        .digest("hex")
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
        "VERIFICATION_EVIDENCE_NOT_FOUND: handle expired or belongs to a previous Gateway process, project epoch, or Runtime generation."
      );
    }
    this.entries.delete(handle);
    this.entries.set(handle, record);
    return structuredClone(record);
  }

  setScopeIdentity(scopeIdentity: string): void {
    if (!scopeIdentity) {
      throw new Error("Verification evidence scope identity must be non-empty.");
    }
    if (scopeIdentity === this.scopeIdentity) return;
    this.entries.clear();
    this.scopeIdentity = scopeIdentity;
  }

  invalidate(handle: VerificationEvidenceHandle): boolean {
    return this.entries.delete(handle);
  }

  clear(): void {
    this.entries.clear();
  }

  size(): number {
    return this.entries.size;
  }
}
