import { createHash } from "node:crypto";
import { posix } from "node:path";

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
  search_terms: string[];
  sha256: string;
};

export type KnowledgeSelection = KnowledgeSection & {
  score: number;
};

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[`*~]/g, "")
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

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "into", "when",
  "only", "then", "use", "using", "one", "not", "are", "but", "can",
  "current", "authoring", "lazydesigner",
]);

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_\-]+/g, " ")
    .split(/\s+/)
    .filter(
      (token) =>
        token.length > 2 &&
        !STOP_WORDS.has(token)
    );
}

function searchTerms(
  headingPath: readonly string[],
  body: string,
  limit = 24
): string[] {
  const counts = new Map<string, number>();
  for (const token of tokens(headingPath.join(" "))) {
    counts.set(token, (counts.get(token) ?? 0) + 4);
  }
  for (const token of tokens(body)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([token]) => token);
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
      search_terms: searchTerms(active.heading_path, body),
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


export function selectKnowledgeSections(input: {
  sections: readonly KnowledgeSection[];
  query: string;
  limit?: number;
  maxTokenProxy?: number;
}): KnowledgeSelection[] {
  const queryTerms = new Set(tokens(input.query));
  const requestedLimit = input.limit ?? 8;
  const requestedBudget = input.maxTokenProxy ?? 1200;
  if (!Number.isFinite(requestedLimit) || !Number.isFinite(requestedBudget)) {
    return []; // Invalid external limits must not disable bounding.
  }
  const boundedLimit = Math.max(1, Math.trunc(requestedLimit));
  const budget = Math.max(1, Math.trunc(requestedBudget));

  const ranked = input.sections
    .map((section) => {
      const headingTerms = new Set(tokens(section.heading_path.join(" ")));
      let score = 0;
      for (const term of queryTerms) {
        if (headingTerms.has(term)) score += 12;
        if (section.search_terms.includes(term)) score += 3;
      }
      return { ...section, score };
    })
    .filter((section) => section.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.token_proxy - right.token_proxy ||
        left.id.localeCompare(right.id)
    );

  const selected: KnowledgeSelection[] = [];
  let used = 0;
  for (const section of ranked) {
    if (selected.length >= boundedLimit) break;
    if (!Number.isFinite(section.token_proxy) || section.token_proxy < 0) continue;
    if (used + section.token_proxy > budget) continue;
    selected.push(section);
    used += section.token_proxy;
  }
  return selected;
}

/**
 * Direct canonical-document navigation edges. Source and target IDs are derived
 * from checked-in paths and are stable across content-only revisions. A file
 * relocation requires updating its canonical link owner.
 *
 * This is a bounded navigation graph, NOT inferred semantic dependency or
 * independent documentation authority.
 */
export type ExplicitDocumentationEdge = {
  from: string;
  to: string;
  label: string;
  from_id: string;
  to_id: string;
  line: number;
  relation: "EXPLICIT_MARKDOWN_LINK";
};

export function indexExplicitDocumentationEdges(
  source: string,
  markdown: string
): ExplicitDocumentationEdge[] {
  if (!source.startsWith("docs/") || !source.endsWith(".md") ||
      source.includes("\\") || source.split("/").includes("..")) {
    throw new Error("Documentation router source must be a canonical docs/*.md path.");
  }

  const edges: ExplicitDocumentationEdge[] = [];
  let fence: { marker: string; size: number } | null = null;
  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    const boundary = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (boundary) {
      const marker = boundary[1]![0]!;
      if (!fence) fence = { marker, size: boundary[1]!.length };
      else if (fence.marker === marker && boundary[1]!.length >= fence.size) {
        fence = null;
      }
      continue;
    }
    if (fence) continue;

    const links = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;
    for (const match of line.matchAll(links)) {
      if (match.index != null && match.index > 0 && line[match.index - 1] === "!") {
        continue; // image reference, not documentation navigation
      }
      const label = match[1]!.trim();
      const href = match[2]!;
      if (href.startsWith("/") || href.startsWith("#") ||
          /^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith("//")) {
        continue;
      }
      const relative = href.split("#", 1)[0]!;
      if (!relative.endsWith(".md") || /[\\?%:]/.test(relative)) continue;
      const target = posix.normalize(posix.join(posix.dirname(source), relative));
      if (!target.startsWith("docs/") || target.split("/").includes("..")) {
        continue; // cannot infer or grant authority outside canonical docs
      }
      // Preserve every authored edge: a duplicate role must remain visible
      // to the fail-closed canonical-router uniqueness check.
      edges.push({
        from: source,
        to: target,
        label,
        from_id: `document:${source.slice(0, -3)}`,
        to_id: `document:${target.slice(0, -3)}`,
        line: index + 1,
        relation: "EXPLICIT_MARKDOWN_LINK",
      });
    }
  }
  return edges;
}
