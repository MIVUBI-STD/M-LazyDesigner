import { describe, expect, test } from "bun:test";
import { capabilityDescriptionRevision } from "../gateway/capabilities/semanticRegistry";

describe("capability describe semantic revision", () => {
  test("changes when the projected input contract changes", () => {
    const base = capabilityDescriptionRevision({
      semanticFingerprint: "semantic-v1",
      inputSchema: {
        type: "object",
        properties: { operation: { const: "update" } },
      },
    });
    const changed = capabilityDescriptionRevision({
      semanticFingerprint: "semantic-v1",
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
      semanticFingerprint: "semantic-v1",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
          operation: { const: "update" },
        },
      },
    });
    const right = capabilityDescriptionRevision({
      semanticFingerprint: "semantic-v1",
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

  test("includes output schema changes in the revision", () => {
    const left = capabilityDescriptionRevision({
      semanticFingerprint: "semantic-v1",
      inputSchema: { type: "object" },
      outputSchema: { type: "object", properties: { changed: { type: "boolean" } } },
    });
    const right = capabilityDescriptionRevision({
      semanticFingerprint: "semantic-v1",
      inputSchema: { type: "object" },
      outputSchema: { type: "object", properties: { changed: { type: "number" } } },
    });

    expect(left).not.toBe(right);
  });
});
