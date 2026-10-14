import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { convertDocSchema } from "../../scripts/generate/internal/doc-schema";

describe("generated API schema integrity", () => {
  test("preserves the canonical JSON-schema conversion for valid inputs", () => {
    const output = convertDocSchema(
      "valid_tool",
      z.object({ element_id: z.string(), count: z.number().int().optional() })
    ) as Record<string, unknown>;
    expect(output.type).toBe("object");
    expect((output.properties as Record<string, unknown>).element_id).toBeDefined();
  });

  test("aborts instead of substituting a permissive schema on conversion errors", () => {
    const underlying = new Error("unexpected conversion failure");
    let reported: unknown;
    try {
      convertDocSchema("broken_tool", z.string(), () => {
        throw underlying;
      });
    } catch (error) {
      reported = error;
    }
    expect(reported).toBeInstanceOf(Error);
    expect((reported as Error).message).toBe(
      'Cannot generate MCP API schema for "broken_tool".'
    );
    expect((reported as Error).cause).toBe(underlying);
  });
});
