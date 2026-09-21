import { describe, expect, test } from "bun:test";
import { capabilityDescriptionRevision } from "../gateway/capabilities/semanticRegistry";

describe("capability describe semantic revision", () => {
  test("changes when the projected input contract changes", () => {
    const base = capabilityDescriptionRevision({
      semantic_id: "branch:manage_cubes/operation=update",
      inputSchema: {
        type: "object",
        properties: { operation: { const: "update" } },
      },
    });
    const changed = capabilityDescriptionRevision({
      semantic_id: "branch:manage_cubes/operation=update",
      inputSchema: {
        type: "object",
        properties: {
          operation: { const: "update" },
          id: { type: "string" },
        },
      },
    });

    expect(base).not.toBe(changed);
  });

  test("is stable across object-key insertion order", () => {
    const left = capabilityDescriptionRevision({
      semantic_id: "branch:manage_cubes/operation=update",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
          operation: { const: "update" },
        },
      },
    });
    const right = capabilityDescriptionRevision({
      semantic_id: "branch:manage_cubes/operation=update",
      inputSchema: {
        properties: {
          operation: { const: "update" },
          id: { type: "string" },
        },
        type: "object",
      },
    });

    expect(left).toBe(right);
  });

  test("routing-only metadata does not affect the describe revision unless emitted", () => {
    const base = capabilityDescriptionRevision({
      semantic_id: "cap:inspect_elements",
      inputSchema: { type: "object" },
    });
    const samePayload = capabilityDescriptionRevision({
      inputSchema: { type: "object" },
      semantic_id: "cap:inspect_elements",
    });
    expect(base).toBe(samePayload);
  });

  test("includes output schema changes in the revision", () => {
    const left = capabilityDescriptionRevision({
      semantic_id: "branch:manage_cubes/operation=update",
      inputSchema: { type: "object" },
      outputSchema: { type: "object", properties: { changed: { type: "boolean" } } },
    });
    const right = capabilityDescriptionRevision({
      semantic_id: "branch:manage_cubes/operation=update",
      inputSchema: { type: "object" },
      outputSchema: { type: "object", properties: { changed: { type: "number" } } },
    });

    expect(left).not.toBe(right);
  });
});
