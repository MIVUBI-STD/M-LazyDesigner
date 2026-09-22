import { describe, expect, test } from "bun:test";
import { planAuthoringDomainInvalidation } from "../gateway/development/domainInvalidation";

describe("authoring domain invalidation", () => {
  test("classifies independent authoring domains without widening", () => {
    expect(
      planAuthoringDomainInvalidation({
        changedPaths: ["mcp/server/tools/textures.ts"],
      }).domains
    ).toEqual(["TEXTURE_UV"]);

    expect(
      planAuthoringDomainInvalidation({
        changedPaths: ["mcp/server/tools/particles.ts"],
      }).domains
    ).toEqual(["PARTICLE"]);
  });

  test("shared semantic ownership invalidates all domains", () => {
    const plan = planAuthoringDomainInvalidation({
      changedPaths: ["mcp/gateway/capabilities/semanticRegistry.ts"],
    });

    expect(plan.full_domain_invalidation).toBe(true);
    expect(plan.domains).toEqual([
      "GEOMETRY",
      "TEXTURE_UV",
      "ANIMATION",
      "PARTICLE",
      "REFERENCE",
      "EXPORT",
    ]);
  });

  test("unknown authoring tool fails wide rather than producing a false negative", () => {
    const plan = planAuthoringDomainInvalidation({
      changedPaths: ["mcp/server/tools/futureAuthoringSurface.ts"],
    });

    expect(plan.full_domain_invalidation).toBe(true);
    expect(plan.domains).toHaveLength(6);
  });
});
