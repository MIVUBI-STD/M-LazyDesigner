import { describe, expect, test } from "bun:test";

const WRAPPERS: Readonly<Record<string, string>> = {
  "lib/productIdentity.ts": 'export * from "./product/productIdentity";\n',
  "lib/resourceUri.ts": 'export * from "./protocol/resourceUri";\n',
  "lib/validationVerdict.ts": 'export * from "./authoring/validationVerdict";\n',
  "lib/authoringReadiness.ts": 'export * from "./authoring/authoringReadiness";\n',
  "lib/bedrockProjectIdentity.ts": 'export * from "./bedrock/projectIdentity";\n',
  "lib/bedrockProjectSemantics.ts": 'export * from "./bedrock/projectSemantics";\n',
  "lib/runtimeConnection.ts": 'export * from "./runtime/connection";\n',
  "lib/runtimeFetch.ts": 'export * from "./runtime/fetch";\n',
  "lib/runtimeAffinity.ts": 'export * from "./runtime/affinity";\n',
  "lib/runtimeLifecycle.ts": 'export * from "./runtime/lifecycle";\n',
};

const CANONICAL_OWNERS = [
  "lib/product/productIdentity.ts",
  "lib/protocol/resourceUri.ts",
  "lib/authoring/validationVerdict.ts",
  "lib/authoring/authoringReadiness.ts",
  "lib/bedrock/projectIdentity.ts",
  "lib/bedrock/projectSemantics.ts",
  "lib/runtime/connection.ts",
  "lib/runtime/fetch.ts",
  "lib/runtime/affinity.ts",
  "lib/runtime/lifecycle.ts",
] as const;

describe("canonical shared library ownership", () => {
  test("migrated root paths remain compatibility-only facades", async () => {
    for (const [path, expected] of Object.entries(WRAPPERS)) {
      expect(await Bun.file(path).text()).toBe(expected);
    }
  });

  test("canonical owners exist outside the lib root", async () => {
    for (const path of CANONICAL_OWNERS) {
      expect(await Bun.file(path).exists()).toBe(true);
    }
  });
});
