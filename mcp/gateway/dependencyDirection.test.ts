import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join, relative, dirname, normalize } from "node:path";

const ROOT = "gateway";

const COMPATIBILITY_WRAPPERS = new Set([
  "capabilityManifest",
  "capabilityIntelligence",
  "capabilityGraph",
  "schemaProjection",
  "capabilityEffects",
  "connectionManager",
  "reconnectPolicy",
  "recovery",
  "runtimeSession",
  "projectAffinity",
  "localCapabilities",
  "vanillaEntityReference",
]);

const CONTROL_COMPATIBILITY_WRAPPERS = new Set([
  "registry",
  "capabilityManifest",
  "delta",
]);

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await sourceFiles(path)));
    } else if (
      entry.isFile() &&
      path.endsWith(".ts") &&
      !path.endsWith(".test.ts")
    ) {
      out.push(path);
    }
  }
  return out;
}

function importsOf(source: string): string[] {
  const imports: string[] = [];
  const regex =
    /(?:import[\s\S]*?from\s*|export\s+(?:\*|\{[\s\S]*?\})\s+from\s*)["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) !== null) {
    imports.push(match[1]!);
  }
  return imports;
}

function resolveRelative(from: string, request: string): string {
  return normalize(join(dirname(from), request))
    .replace(/\\/g, "/")
    .replace(/\.ts$/, "");
}

function layer(path: string):
  | "root"
  | "capabilities"
  | "runtime"
  | "providers"
  | "control" {
  const rel = relative(ROOT, path).replace(/\\/g, "/");
  const first = rel.split("/")[0];
  if (first === "capabilities") return "capabilities";
  if (first === "runtime") return "runtime";
  if (first === "providers") return "providers";
  if (first === "control") return "control";
  return "root";
}

describe("Gateway dependency direction", () => {
  test("production code does not import migrated root compatibility wrappers", async () => {
    const files = await sourceFiles(ROOT);
    const violations: string[] = [];

    for (const file of files) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (!rel.includes("/")) continue;

      const source = await Bun.file(file).text();
      for (const request of importsOf(source)) {
        if (!request.startsWith(".")) continue;
        const resolved = resolveRelative(file, request);
        const targetRel = relative(ROOT, resolved).replace(/\\/g, "/");

        if (
          !targetRel.includes("/") &&
          COMPATIBILITY_WRAPPERS.has(targetRel)
        ) {
          violations.push(`${rel} -> ${request}`);
        }

        if (
          rel.startsWith("control/") &&
          targetRel.startsWith("control/") &&
          CONTROL_COMPATIBILITY_WRAPPERS.has(
            targetRel.slice("control/".length)
          )
        ) {
          violations.push(`${rel} -> ${request}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  test("leaf Gateway layers cannot depend on Control orchestration", async () => {
    const files = await sourceFiles(ROOT);
    const violations: string[] = [];

    for (const file of files) {
      const owner = layer(file);
      if (
        owner !== "capabilities" &&
        owner !== "runtime" &&
        owner !== "providers"
      ) {
        continue;
      }

      const source = await Bun.file(file).text();
      for (const request of importsOf(source)) {
        if (!request.startsWith(".")) continue;
        const resolved = resolveRelative(file, request);
        const targetLayer = layer(resolved);

        if (targetLayer === "control") {
          violations.push(
            `${relative(ROOT, file)} [${owner}] -> ${request} [control]`
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  test("providers remain leaf integrations, not runtime/control orchestrators", async () => {
    const files = (await sourceFiles(join(ROOT, "providers")));
    const violations: string[] = [];

    for (const file of files) {
      const source = await Bun.file(file).text();
      for (const request of importsOf(source)) {
        if (!request.startsWith(".")) continue;
        const target = layer(resolveRelative(file, request));
        if (target === "runtime" || target === "control") {
          violations.push(
            `${relative(ROOT, file)} -> ${request}`
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
