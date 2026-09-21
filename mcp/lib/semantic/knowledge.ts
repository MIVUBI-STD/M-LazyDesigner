import { createHash } from "node:crypto";

export type KnowledgeSection = {
  id: string;
  source: string;
  heading: string;
  heading_path: string[];
  level: number;
  start_line: number;
  end_line: number;
  bytes: number;
  token_proxy: number;
  sha256: string;
};

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sectionId(source: string, headingPath: readonly string[]): string {
  const file = source
    .replaceAll("\\", "/")
    .replace(/^\.\.\//, "")
    .replace(/\.md$/i, "")
    .split("/")
    .map(slug)
    .filter(Boolean)
    .join("/");
  const path = headingPath.map(slug).filter(Boolean).join("/");
  return `knowledge:${file}${path ? `#${path}` : ""}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

/**
 * Parse ATX Markdown headings into addressable, content-hashed knowledge sections.
 *
 * Headings inside fenced code are ignored. Each section owns only its body up to
 * the next heading; hierarchy is carried separately in heading_path so retrieval
 * can load one exact section without retransmitting sibling content.
 */
export function indexMarkdownKnowledge(
  source: string,
  text: string
): KnowledgeSection[] {
  const lines = text.split(/\r?\n/);
  const sections: KnowledgeSection[] = [];
  const headingStack: Array<{ level: number; heading: string }> = [];
  let fence: string | null = null;
  let active:
    | {
        id: string;
        heading: string;
        heading_path: string[];
        level: number;
        start_line: number;
        body_start_line: number;
      }
    | null = null;

  function finish(endLineExclusive: number): void {
    if (!active) return;
    const body = lines
      .slice(active.body_start_line - 1, endLineExclusive - 1)
      .join("\n")
      .trimEnd();
    sections.push({
      id: active.id,
      source,
      heading: active.heading,
      heading_path: active.heading_path,
      level: active.level,
      start_line: active.start_line,
      end_line: Math.max(active.start_line, endLineExclusive - 1),
      bytes: byteLength(body),
      token_proxy: Math.ceil(body.length / 4),
      sha256: sha256(body),
    });
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const fenceMatch = line.match(/^\s*([`~]{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1]![0]!;
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence !== null) continue;

    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!headingMatch) continue;

    finish(index + 1);

    const level = headingMatch[1]!.length;
    const heading = headingMatch[2]!.trim();
    while (
      headingStack.length > 0 &&
      headingStack[headingStack.length - 1]!.level >= level
    ) {
      headingStack.pop();
    }
    headingStack.push({ level, heading });
    const headingPath = headingStack.map((entry) => entry.heading);
    active = {
      id: sectionId(source, headingPath),
      heading,
      heading_path: headingPath,
      level,
      start_line: index + 1,
      body_start_line: index + 2,
    };
  }

  finish(lines.length + 1);

  const seen = new Set<string>();
  for (const section of sections) {
    if (seen.has(section.id)) {
      throw new Error(
        `Duplicate knowledge section id "${section.id}" in ${source}. Rename one heading path to make semantic ownership explicit.`
      );
    }
    seen.add(section.id);
  }
  return sections;
}

export function knowledgeIndexFingerprint(
  sections: readonly KnowledgeSection[]
): string {
  const stable = sections
    .map((section) => ({
      id: section.id,
      source: section.source,
      start_line: section.start_line,
      end_line: section.end_line,
      sha256: section.sha256,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return sha256(JSON.stringify(stable));
}
