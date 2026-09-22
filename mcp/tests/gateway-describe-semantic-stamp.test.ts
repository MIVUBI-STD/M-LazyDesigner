import { describe, expect, test } from "bun:test";
import { gatewayDescribeSuccessOutputSchema } from "../gateway/outputSchemas";
import { semanticDerivedArtifactStamp } from "../gateway/development/semanticArtifact";

describe("gateway describe semantic stamp", () => {
  test("accepts canonical semantic artifact metadata", () => {
    const result = gatewayDescribeSuccessOutputSchema.safeParse({
      capability: {
        semantic_id: "cap:test",
        semantic_revision: "a".repeat(64),
        semantic: semanticDerivedArtifactStamp("DESCRIBE_REPORT"),
        inputSchema: {},
      },
    });

    expect(result.success).toBe(true);
  });
});
