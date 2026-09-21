import { describe, expect, test } from "bun:test";
import {
  CAPABILITY_BRANCH_MANIFEST,
  manifestEntriesForCapability,
  manifestEntryForBranch,
} from "./capabilityManifest";
import { listCapabilityGraph } from "./capabilityGraph";
import { listCapabilitySemantics } from "./capabilityIntelligence";
import { listCapabilitySchemaBranches } from "./schemaProjection";

function key(
  capability: string,
  branch?: { field: string; value: string }
): string {
  return branch
    ? `${capability}:${branch.field}=${branch.value}`
    : capability;
}

describe("canonical capability manifest", () => {
  test("has unique capability+branch identities", () => {
    const keys = CAPABILITY_BRANCH_MANIFEST.map((entry) =>
      key(entry.capability, entry.branch)
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("semantic routing and graph are projections of the manifest", () => {
    const semanticKeys = listCapabilitySemantics().map((entry) =>
      key(entry.capability, entry.branch)
    );
    const expectedSemanticKeys = CAPABILITY_BRANCH_MANIFEST
      .filter((entry) => entry.semantic)
      .map((entry) => key(entry.capability, entry.branch));
    expect(semanticKeys).toEqual(expectedSemanticKeys);

    const graphKeys = listCapabilityGraph().map((entry) =>
      key(entry.capability, entry.branch)
    );
    const expectedGraphKeys = CAPABILITY_BRANCH_MANIFEST
      .filter((entry) => entry.graph)
      .map((entry) => key(entry.capability, entry.branch));
    expect(graphKeys).toEqual(expectedGraphKeys);
  });

  test("schema projection branches are sourced only from manifest schema fields", () => {
    for (const capability of new Set(
      CAPABILITY_BRANCH_MANIFEST.map((entry) => entry.capability)
    )) {
      const actual = listCapabilitySchemaBranches(capability).map((branch) =>
        key(capability, branch)
      );
      const expected = manifestEntriesForCapability(capability)
        .filter((entry) => entry.branch && entry.schemaFields)
        .map((entry) => key(capability, entry.branch));
      expect(actual).toEqual(expected);
    }
  });

  test("branch lookup prefers exact branch and falls back only to branchless capability metadata", () => {
    expect(
      manifestEntryForBranch("manage_uv_layout", {
        field: "operation",
        value: "apply",
      })?.graph?.requires
    ).toContain("uv_plan_available");

    expect(
      manifestEntryForBranch("manage_animation_timeline", {
        field: "operation",
        value: "timeline",
      })?.schemaFields
    ).toContain("easing");

    expect(
      manifestEntryForBranch("manage_animation_timeline", {
        field: "operation",
        value: "future_unknown_branch",
      })?.semantic?.intents
    ).toContain("edit keyframe");
  });
});
