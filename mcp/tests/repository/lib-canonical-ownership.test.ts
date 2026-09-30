import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

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

const RETIRED_PRODUCTION_LIB_FACADES = new Set([
  "productIdentity",
  "resourceUri",
  "validationVerdict",
  "authoringReadiness",
  "bedrockProjectIdentity",
  "bedrockProjectSemantics",
  "runtimeConnection",
  "runtimeFetch",
  "runtimeAffinity",
  "runtimeLifecycle",
  "capabilityMetadata",
  "authoringPhase",
  "registrationProfile",
  "assetHealth",
  "assetDependencyGraph",
  "semanticHistory",
  "elementSemanticScopes",
  "textureBitmapRuntime",
  "util",
  "zodObjects",
]);

async function productionSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const next = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await productionSourceFiles(next)));
    } else if (
      entry.isFile() &&
      next.endsWith(".ts") &&
      !next.endsWith(".test.ts") &&
      !next.includes("/experimental/generated/")
    ) {
      files.push(next);
    }
  }
  return files;
}

function moduleRequests(source: string): string[] {
  return [...source.matchAll(
    /(?:import[\s\S]*?from\s*|export\s+(?:\*|\{[\s\S]*?\})\s+from\s*)["']([^"']+)["']/g
  )].map((match) => match[1]!);
}

describe("production lib facade retirement", () => {
  test("production code does not reintroduce retired lib root facades", async () => {
    const files = [
      "index.ts",
      ...(await productionSourceFiles("gateway")),
      ...(await productionSourceFiles("plugin")),
      ...(await productionSourceFiles("server")),
    ];
    const violations: string[] = [];

    for (const file of files) {
      const source = await Bun.file(file).text();
      for (const request of moduleRequests(source)) {
        const match = request.match(/(?:^|\/)lib\/([A-Za-z0-9_-]+)$/);
        if (!match || !RETIRED_PRODUCTION_LIB_FACADES.has(match[1]!)) continue;
        violations.push(
          `${relative(".", file).replace(/\\/g, "/")} -> ${request}`
        );
      }
    }

    expect(violations).toEqual([]);
  });
});