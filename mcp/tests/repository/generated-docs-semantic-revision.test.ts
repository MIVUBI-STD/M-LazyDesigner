import { describe, expect, test } from "bun:test";
import { CAPABILITY_SEMANTIC_CATALOG_REVISIONS } from "../../gateway/capabilities/semanticRegistry";

describe("generated docs semantic revision", () => {
  test("canonical revision is stable enough to stamp generated API docs", () => {
    console.log(
      "[semantic-doc-revisions]",
      JSON.stringify(CAPABILITY_SEMANTIC_CATALOG_REVISIONS)
    );
    for (const value of Object.values(CAPABILITY_SEMANTIC_CATALOG_REVISIONS)) {
      expect(value).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});
