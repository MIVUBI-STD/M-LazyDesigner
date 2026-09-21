import { createHash } from "node:crypto";
import type { AuthoringRecipeApplyReceipt } from "@/lib/authoringRecipe/transaction";
import type { SemanticIdentityResolution } from "@/lib/authoringRecipe/semanticIdentity";

export type AuthoringEvidence =
  | { kind: "SEMANTIC_IDENTITY"; value: SemanticIdentityResolution }
  | { kind: "APPLY_RECEIPT"; value: AuthoringRecipeApplyReceipt };

export type AuthoringEvidenceHandle = `authoringevidence:${string}`;

export class AuthoringEvidenceRegistry {
  private readonly entries = new Map<AuthoringEvidenceHandle, AuthoringEvidence>();

  constructor(private readonly maxEntries = 16) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > 64) {
      throw new Error("Authoring evidence registry maxEntries must be 1..64.");
    }
  }

  put(evidence: AuthoringEvidence): AuthoringEvidenceHandle {
    const handle = (
      "authoringevidence:" +
      createHash("sha256").update(JSON.stringify(evidence)).digest("hex")
    ) as AuthoringEvidenceHandle;
    this.entries.delete(handle);
    this.entries.set(handle, structuredClone(evidence));
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (!oldest) break;
      this.entries.delete(oldest);
    }
    return handle;
  }

  get(handle: AuthoringEvidenceHandle): AuthoringEvidence {
    const evidence = this.entries.get(handle);
    if (!evidence) {
      throw new Error(
        "AUTHORING_EVIDENCE_NOT_FOUND: handle expired or belongs to a previous Runtime generation."
      );
    }
    this.entries.delete(handle);
    this.entries.set(handle, evidence);
    return structuredClone(evidence);
  }

  size(): number {
    return this.entries.size;
  }
}
