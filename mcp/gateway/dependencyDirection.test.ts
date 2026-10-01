import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join, relative, dirname, normalize } from "node:path";

const ROOT = "gateway";

const COMPATIBILITY_WRAPPERS = new Set([
  "statusProjection",
  "resultCompaction",
  "outputSchemas",
  "protocol",
  "backend",
  "contract",
  "controlReceipt",
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
  "sourceOwners",
  "developmentIntent",
  "registry",
  "capabilityManifest",
  "delta",
]);

const ROOT_COMPATIBILITY_FILES = new Set(
  [...COMPATIBILITY_WRAPPERS].map((name) => `${name}.ts`)
);

const ROOT_RUNTIME_COMPATIBILITY_WRAPPERS = new Set([
  "connectionManager",
  "reconnectPolicy",
  "recovery",
  "runtimeSession",
  "projectAffinity",
]);

const RUNTIME_SUBDOMAIN_COMPATIBILITY_WRAPPERS = new Set([
  "benchmarkTrace",
  "orchestrationRecoveryState",
  "capabilityExecutor",
  "projectAffinity",
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
  | "execution"
  | "session"
  | "control" {
  const rel = relative(ROOT, path).replace(/\\/g, "/");
  const first = rel.split("/")[0];
  if (first === "capabilities") return "capabilities";
  if (first === "runtime") return "runtime";
  if (first === "providers") return "providers";
  if (first === "execution") return "execution";
  if (first === "session") return "session";
  if (first === "control") return "control";
  return "root";
}

describe("Gateway dependency direction", () => {
  test("production code does not import migrated root compatibility wrappers", async () => {
    const files = await sourceFiles(ROOT);
    const violations: string[] = [];

    for (const file of files) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (ROOT_COMPATIBILITY_FILES.has(rel)) continue;
      if (
        rel.startsWith("control/") &&
        CONTROL_COMPATIBILITY_WRAPPERS.has(
          rel.slice("control/".length).replace(/\.ts$/, "")
        )
      ) {
        continue;
      }

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

  test("production code bypasses Runtime subdomain compatibility wrappers", async () => {
    const files = await sourceFiles(ROOT);
    const violations: string[] = [];

    for (const file of files) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      const ownRuntimeWrapper =
        rel.startsWith("runtime/") && rel.endsWith(".ts")
          ? rel.slice("runtime/".length, -3)
          : null;
      if (
        ownRuntimeWrapper &&
        RUNTIME_SUBDOMAIN_COMPATIBILITY_WRAPPERS.has(ownRuntimeWrapper)
      ) {
        continue;
      }

      const source = await Bun.file(file).text();
      for (const request of importsOf(source)) {
        if (!request.startsWith(".")) continue;
        const targetRel = relative(
          ROOT,
          resolveRelative(file, request)
        ).replace(/\\/g, "/");
        const targetRuntimeWrapper =
          targetRel.startsWith("runtime/")
            ? targetRel.slice("runtime/".length)
            : null;

        if (
          targetRuntimeWrapper &&
          RUNTIME_SUBDOMAIN_COMPATIBILITY_WRAPPERS.has(targetRuntimeWrapper)
        ) {
          violations.push(
            `${rel} -> ${request}`
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  test("Gateway tests exercise canonical Runtime owners directly", async () => {
    const entries = await readdir(ROOT, { withFileTypes: true });
    const violations: string[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".test.ts")) continue;
      const file = join(ROOT, entry.name);
      const source = await Bun.file(file).text();

      for (const request of importsOf(source)) {
        if (!request.startsWith(".")) continue;
        const targetRel = relative(
          ROOT,
          resolveRelative(file, request)
        ).replace(/\\/g, "/");

        const runtimeWrapper =
          targetRel.startsWith("runtime/")
            ? targetRel.slice("runtime/".length)
            : null;
        if (
          (!targetRel.includes("/") &&
            ROOT_RUNTIME_COMPATIBILITY_WRAPPERS.has(targetRel)) ||
          (runtimeWrapper &&
            RUNTIME_SUBDOMAIN_COMPATIBILITY_WRAPPERS.has(runtimeWrapper))
        ) {
          violations.push(`${entry.name} -> ${request}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  test("leaf Gateway layers cannot depend on Control orchestration", async () => {
    const files = await sourceFiles(ROOT);
    const violations: string[] = [];

    for (const file of files) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      const runtimeStem =
        rel.startsWith("runtime/") && rel.endsWith(".ts")
          ? rel.slice("runtime/".length, -3)
          : null;
      if (
        runtimeStem &&
        RUNTIME_SUBDOMAIN_COMPATIBILITY_WRAPPERS.has(runtimeStem)
      ) {
        continue;
      }

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

        if (
          targetLayer === "control" ||
          targetLayer === "execution"
        ) {
          violations.push(
            `${relative(ROOT, file)} [${owner}] -> ${request} [${targetLayer}]`
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  test("execution is the only cross-layer Runtime + Control coordinator", async () => {
    const files = await sourceFiles(join(ROOT, "execution"));
    expect(files.length).toBeGreaterThan(0);

    const source = (await Promise.all(
      files.map((file) => Bun.file(file).text())
    )).join("\n");

    expect(source).toContain("../runtime/");
    expect(source).toContain("../control");
  });

  test("Development Intelligence cannot depend on Control", async () => {
    const files = await sourceFiles(join(ROOT, "development"));
    const violations: string[] = [];

    for (const file of files) {
      const source = await Bun.file(file).text();
      for (const request of importsOf(source)) {
        if (!request.startsWith(".")) continue;
        const targetRel = relative(
          ROOT,
          resolveRelative(file, request)
        ).replace(/\\/g, "/");
        if (targetRel.startsWith("control/")) {
          violations.push(
            `${relative(ROOT, file).replace(/\\/g, "/")} -> ${request}`
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  test("neutral Gateway context does not depend on Control or Development", async () => {
    const contextDir = join(ROOT, "context");
    const files = await sourceFiles(contextDir);
    const violations: string[] = [];

    for (const file of files) {
      const source = await Bun.file(file).text();
      for (const request of importsOf(source)) {
        if (!request.startsWith(".")) continue;
        const targetRel = relative(
          ROOT,
          resolveRelative(file, request)
        ).replace(/\\/g, "/");
        if (
          targetRel.startsWith("control/") ||
          targetRel.startsWith("development/")
        ) {
          violations.push(
            `${relative(ROOT, file).replace(/\\/g, "/")} -> ${request}`
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  test("Runtime transport cannot depend on execution orchestration", async () => {
    const files = await sourceFiles(join(ROOT, "runtime"));
    const violations: string[] = [];

    for (const file of files) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      const runtimeStem =
        rel.startsWith("runtime/") && rel.endsWith(".ts")
          ? rel.slice("runtime/".length, -3)
          : null;
      if (
        runtimeStem &&
        RUNTIME_SUBDOMAIN_COMPATIBILITY_WRAPPERS.has(runtimeStem)
      ) {
        continue;
      }
      const source = await Bun.file(file).text();
      for (const request of importsOf(source)) {
        if (!request.startsWith(".")) continue;
        const target = layer(resolveRelative(file, request));
        if (target === "execution") {
          violations.push(`${rel} -> ${request}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  test("Session state cannot depend on execution or Runtime transport", async () => {
    const files = await sourceFiles(join(ROOT, "session"));
    const violations: string[] = [];

    for (const file of files) {
      const source = await Bun.file(file).text();
      for (const request of importsOf(source)) {
        if (!request.startsWith(".")) continue;
        const target = layer(resolveRelative(file, request));
        if (target === "execution" || target === "runtime") {
          violations.push(
            `${relative(ROOT, file).replace(/\\/g, "/")} -> ${request}`
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
