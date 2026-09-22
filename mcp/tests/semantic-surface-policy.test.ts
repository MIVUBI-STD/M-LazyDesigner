import { describe, expect, test } from "bun:test";
import {
  semanticRefreshSurfacesForDimensions,
  semanticVerificationChecksForSurfaces,
} from "../gateway/development/semanticDependencyMatrix";

describe("semantic surface policy", () => {
  test("refresh routing is derived from central surface policy", () => {
    expect(semanticRefreshSurfacesForDimensions(["routing"])).toEqual([
      "AI_CONTEXT",
      "CAPABILITY_SEARCH",
    ]);
    expect(semanticRefreshSurfacesForDimensions(["schema_projection"])).toEqual([
      "DESCRIBE_SCHEMA",
    ]);
  });

  test("verification checks are derived from affected surfaces", () => {
    expect(
      semanticVerificationChecksForSurfaces([
        "CAPABILITY_SEARCH",
        "DESCRIBE_SCHEMA",
      ])
    ).toEqual([
      "CAPABILITY_INTELLIGENCE",
      "CAPABILITY_MANIFEST",
      "DECISION_EFFICIENCY",
      "DESCRIBE_PAYLOADS",
    ]);
  });
});
