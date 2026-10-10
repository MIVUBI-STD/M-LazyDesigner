import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const ROOT = "../.agents/skills";
const DATA_TYPES = new Set([".md", ".json", ".txt", ".png", ".jpg", ".jpeg", ".webp"]);

async function collectFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isSymbolicLink()) throw new Error(`Skill symlink/path escape forbidden: ${path}`);
    if (item.isDirectory()) files.push(...(await collectFiles(path)));
    else if (item.isFile()) files.push(path);
    else throw new Error(`Unknown filesystem entry in Skills: ${path}`);
  }
  return files;
}

describe("agent Skill supply-chain admission", () => {
  test("installed canonical skill packages contain no unreviewed scripts, binaries or symlinks", async () => {
    const files = await collectFiles(ROOT);
    expect(files.length).toBeGreaterThanOrEqual(11);
    for (const path of files) {
      const ext = extname(path).toLowerCase();
      expect(DATA_TYPES.has(ext), `Executable/unreviewed Skill asset: ${relative(ROOT, path)}`).toBe(true);
    }
  });

  test("Skill Markdown contains no direct command pipe to shell or explicit instruction override", async () => {
    const files = (await collectFiles(ROOT)).filter(path => path.toLowerCase().endsWith(".md"));
    const forbidden = [
      /\b(?:curl|wget)\b[^\n]{0,160}\|\s*(?:sudo\s+)?(?:sh|bash|zsh)\b/i,
      /\b(?:base64\s+(?:-d|--decode)|atob\s*\()[^\n]{0,120}\|\s*(?:sh|bash|node|python)\b/i,
      /ignore\s+(?:all\s+)?(?:previous|prior|system|developer)\s+instructions/i,
    ];
    for (const path of files) {
      const content = await readFile(path, "utf8");
      for (const pattern of forbidden) {
        expect(pattern.test(content), `Unsafe Skill instruction in ${relative(ROOT, path)}: ${pattern.source}`).toBe(false);
      }
    }
  });

  test("canonical taxonomy owns adoption and preflight CLI denies non-allow outcomes", async () => {
    const [taxonomy, preflight] = await Promise.all([
      Bun.file("../docs/04-system/skill-taxonomy.md").text(),
      Bun.file("../.agents/permissions/preflight.mjs").text(),
    ]);
    expect(taxonomy).toContain("Skill Supply-Chain Admission");
    expect(taxonomy).toContain("untrusted data");
    expect(preflight).toContain('verdict.decision === "allow" ? 0 : verdict.decision === "ask" ? 3 : 4');
  });
});
