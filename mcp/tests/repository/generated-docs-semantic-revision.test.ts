import { describe, expect, test } from "bun:test";
import { CAPABILITY_SEMANTIC_CATALOG_REVISIONS } from "../../gateway/capabilities/semanticRegistry";

describe("generated docs semantic revision", () => {
  test("api.json stays stamped with the canonical semantic catalog", async () => {
    const api = JSON.parse(
      await Bun.file("docs/api.json").text()
    ) as {
      semantic?: {
        semantic_revision_schema?: number;
        artifact_kind?: string;
        revisions?: Record<string, string>;
      };
    };

    expect(api.semantic?.semantic_revision_schema).toBe(1);
    expect(api.semantic?.artifact_kind).toBe("DOCS_API");
    expect(api.semantic?.revisions).toEqual(
      CAPABILITY_SEMANTIC_CATALOG_REVISIONS
    );
  });
});
