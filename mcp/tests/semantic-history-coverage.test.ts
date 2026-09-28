import { describe, expect, test } from "bun:test";
import { CAPABILITY_CORE_MANIFEST } from "@/lib/capabilities/manifest";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const TOOL_ROOT = "server/tools";
const SEMANTIC_HISTORY_EXEMPTIONS = new Set([
  "server/tools/ui.ts",
]);

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await sourceFiles(path)));
    } else if (entry.isFile() && path.endsWith(".ts")) {
      files.push(path.replaceAll("\\", "/"));
    }
  }
  return files;
}

describe("semantic Undo history coverage", () => {
  test("every discovered authored Undo commit records bounded semantic effect metadata", async () => {
    const files = await sourceFiles(TOOL_ROOT);
    const mutationFiles: string[] = [];

    for (const path of files) {
      const source = await Bun.file(path).text();
      const finishCount = source.match(/Undo\.finishEdit\(/g)?.length ?? 0;
      if (finishCount === 0) continue;

      mutationFiles.push(path);
      if (SEMANTIC_HISTORY_EXEMPTIONS.has(path)) continue;

      const semanticCount =
        source.match(
          /recordCurrent(?:Capability)?SemanticHistoryEffect(?:IfAdvanced)?\(/g
        )?.length ?? 0;

      expect(
        semanticCount,
        `${relative(".", path)} must annotate every Undo.finishEdit()`
      ).toBe(finishCount);
    }

    expect(mutationFiles.length).toBeGreaterThan(0);
    for (const exempt of SEMANTIC_HISTORY_EXEMPTIONS) {
      expect(mutationFiles, `stale semantic-history exemption: ${exempt}`).toContain(exempt);
    }
  });

  test("capability-derived semantic annotations reference only canonical authored capabilities", async () => {
    const files = await sourceFiles(TOOL_ROOT);
    const referenced = new Set<string>();

    for (const path of files) {
      const source = await Bun.file(path).text();
      for (const match of source.matchAll(
        /recordCurrentCapabilitySemanticHistoryEffect(?:IfAdvanced)?\(\s*["']([^"']+)["']/g
      )) {
        referenced.add(match[1]!);
      }
    }

    expect(referenced.size).toBeGreaterThan(0);
    for (const capability of referenced) {
      const entry = CAPABILITY_CORE_MANIFEST.get(capability);
      expect(entry, capability).toBeDefined();
      expect(entry?.stateClass, capability).toBeDefined();
      expect(entry?.defaultStaleScopes, capability).toBeDefined();
    }
  });

  test("semantic-history exemptions stay explicit and maintenance-only", async () => {
    const source = await Bun.file("server/tools/ui.ts").text();
    expect(SEMANTIC_HISTORY_EXEMPTIONS).toEqual(
      new Set(["server/tools/ui.ts"])
    );
    expect(source.match(/Undo\.finishEdit\(/g)?.length ?? 0).toBeGreaterThan(0);
    expect(
      source.match(
        /recordCurrent(?:Capability)?SemanticHistoryEffect(?:IfAdvanced)?\(/g
      )?.length ?? 0
    ).toBe(0);
    expect(source).toContain("risky_eval");
    expect(source).toContain("trigger_action");
  });

  test("semantic history remains ephemeral and fail-closed", async () => {
    const source = await Bun.file("lib/semanticHistory.ts").text();

    expect(source).toContain("new WeakMap<object, SemanticHistoryEffect>()");
    expect(source).not.toContain("writeFile");
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain("indexedDB");
    expect(source).toContain("return effects.get(entry) ?? null");
  });
});
