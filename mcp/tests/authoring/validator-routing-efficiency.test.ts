import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("validator routing efficiency", () => {
  test("Gateway does not proxy Direct Runtime validator resources", async () => {
    const [validator, gateway, verdict] = await Promise.all([
      source("server/resources/validator.ts"),
      source("gateway/index.ts"),
      source("lib/authoring/validationVerdict.ts"),
    ]);

    expect(gateway).toContain("Runtime resources and prompts are not proxied");
    expect(gateway).not.toContain("registerResource(");
    expect(gateway).not.toContain("registerPrompt(");

    expect(validator).toContain('uriTemplate: "validator://status"');
    expect(validator).toContain("deriveValidatorGateVerdict");
    expect(validator).toContain('errors: "validator://errors"');
    expect(validator).toContain('warnings: "validator://warnings"');

    expect(verdict).toContain('state: "VALIDATOR_CLEAR"');
    expect(verdict).toContain("visual_pass_claim: false");
    expect(verdict).toContain("approval_claim: false");
    expect(verdict).toContain("does not imply reference fidelity, visual PASS, or user approval");
  });
});
