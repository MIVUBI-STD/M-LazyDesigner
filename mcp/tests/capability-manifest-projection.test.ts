import { describe, expect, test } from "bun:test";
import { capabilityManifestSnapshot } from "../gateway/capabilities/manifestProjection";
import { CAPABILITY_BRANCH_MANIFEST } from "../gateway/capabilities/manifest";
import { CAPABILITY_SEMANTIC_CATALOG_REVISIONS } from "../gateway/capabilities/semanticRegistry";

describe("capability manifest semantic projection", () => {
  test("keeps canonical entries and stamps the derived snapshot", () => {
    const snapshot = capabilityManifestSnapshot();
    expect(snapshot.entries).toBe(CAPABILITY_BRANCH_MANIFEST);
    expect(snapshot.semantic.artifact_kind).toBe("CAPABILITY_MANIFEST");
    expect(snapshot.semantic.revisions).toEqual(
      CAPABILITY_SEMANTIC_CATALOG_REVISIONS
    );
  });
});
