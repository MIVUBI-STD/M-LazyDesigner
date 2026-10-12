/**
 * Opt-in, read-only REA artifact audit. This is development evidence, never an
 * authoring tool, live Blockbench verifier, or visual acceptance shortcut.
 *
 * REA CLI: https://github.com/morluto/rea
 * REA executes its analyzer, not the inspected JavaScript application.
 */
import { spawn } from "node:child_process";
import { copyFileSync, mkdtempSync, openSync, closeSync,
  readFileSync, realpathSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";

const MAX_EVIDENCE_BYTES = 64 * 1024 * 1024;
const ID_PATTERN = /^ev_[a-f0-9]{64}$/;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const COVERAGE = ["complete", "partial", "unknown", "unavailable"] as const;
type CoverageStatus = (typeof COVERAGE)[number];
type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject : null;
}
function invalid(reason: string): never {
  throw new Error("REA_EVIDENCE_INVALID: " + reason);
}
function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((v: unknown) => typeof v !== "string")) {
    return invalid(field + " must be a string array.");
  }
  return value as string[];
}
function nonnegative(value: unknown, field: string): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value : invalid(field + " must be a nonnegative integer.");
}
function coverage(value: unknown, semantic: boolean) {
  const c = object(value);
  const omitted = semantic ? c?.omitted_nodes : c?.omitted_count;
  if (!c || !COVERAGE.includes(c.status as CoverageStatus) ||
      typeof c.truncated !== "boolean" || !Array.isArray(c.limits) ||
      !(omitted === null || (typeof omitted === "number" &&
        Number.isSafeInteger(omitted) && omitted >= 0)) ||
      (semantic && !(c.omitted_relations === null ||
        (typeof c.omitted_relations === "number" &&
        Number.isSafeInteger(c.omitted_relations) && c.omitted_relations >= 0)))) {
    return invalid("graph coverage does not follow the upstream REA contract.");
  }
  if ((c.status === "complete" && (c.truncated || omitted !== 0 ||
        (semantic && c.omitted_relations !== 0))) ||
      ((c.status === "unknown" || c.status === "unavailable") &&
        (c.truncated || omitted !== null)) ||
      (c.truncated && (c.status !== "partial" || c.limits.length === 0))) {
    return invalid("contradictory graph coverage.");
  }
  return { status: c.status as CoverageStatus, truncated: c.truncated };
}

/** Source-reported REA evidence only: shape checked, not hash-authenticated. */
export function projectReaStaticEvidence(input: unknown) {
  const e = object(input);
  const provider = object(e?.provider);
  const subject = object(e?.subject);
  const digest = object(subject?.digest);
  const result = object(e?.normalized_result);
  const graph = object(result?.graph);
  const semantic = object(result?.semantic_graph);
  const stats = object(result?.statistics);
  if (!e || !ID_PATTERN.test(String(e.evidence_id ?? "")) ||
      e.operation !== "analyze_javascript_application" ||
      e.predicate_type !== "rea.javascript-application-analysis" ||
      e.authority !== "shipped-artifact" || e.confidence !== "derived" ||
      provider?.id !== "rea-javascript-application" ||
      typeof provider.name !== "string" ||
      !subject || !DIGEST_PATTERN.test(String(digest?.sha256 ?? "")) ||
      (subject.format !== "asar" && subject.format !== "directory") ||
      !result || !graph || !semantic || !stats) {
    return invalid("expected JavaScript application Evidence envelope.");
  }
  if (result.format !== subject.format ||
      result.root_artifact_sha256 !== digest!.sha256 ||
      graph.schema !== "JavaScriptApplicationGraph" ||
      typeof graph.graph_id !== "string" ||
      semantic.schema !== "JavaScriptSemanticRelationGraph" ||
      semantic.application_graph_id !== graph.graph_id ||
      semantic.root_artifact_sha256 !== digest!.sha256 ||
      !Array.isArray(graph.nodes) || graph.nodes.length === 0 ||
      !Array.isArray(semantic.nodes) || semantic.nodes.length === 0 ||
      !Array.isArray(semantic.unknowns) ||
      !Array.isArray(object(semantic.coverage)?.families) ||
      !Array.isArray(result.integrity_contradictions)) {
    return invalid("source/graph identity or evidence structure is inconsistent.");
  }
  const application = coverage(graph.coverage, false);
  const semantics = coverage(semantic.coverage, true);
  const families = (object(semantic.coverage)!.families as unknown[])
    .map(family => object(family)?.status);
  if (families.length !== 12 || families.some(f =>
      !["complete", "partial", "unknown", "unsupported"].includes(String(f)))) {
    return invalid("semantic relation families are malformed.");
  }
  const selection = result.source_selection === undefined
    ? null : object(result.source_selection);
  if (result.source_selection !== undefined &&
      (!selection || !Array.isArray(selection.requested_paths))) {
    return invalid("source selection is malformed.");
  }
  const unselected = selection ? nonnegative(selection.unselected_files, "unselected_files") : 0;
  const parseFailures = nonnegative(stats.parse_failures, "parse_failures");
  const limitations = [
    ...stringArray(e.limitations, "Evidence limitations"),
    ...stringArray(result.limitations, "result limitations"),
    ...stringArray(graph.limitations, "graph limitations"),
    ...stringArray(semantic.limitations, "semantic limitations"),
  ];
  const incompleteFamilies = families.filter(status => status !== "complete").length;
  const complete = application.status === "complete" &&
    semantics.status === "complete" && incompleteFamilies === 0 &&
    semantic.unknowns.length === 0 && unselected === 0 && parseFailures === 0 &&
    result.integrity_contradictions.length === 0 && limitations.length === 0;
  return {
    schema: "lazydesigner-rea-static-audit-v1",
    evidence_id: e.evidence_id,
    evidence_id_check: "FORMAT_ONLY_NOT_AUTHENTICATED",
    provider: { id: provider!.id, name: provider!.name,
      version: typeof provider!.version === "string" ? provider!.version : null },
    artifact: { sha256: digest!.sha256, format: subject.format },
    application_graph_coverage: application.status,
    semantic_graph_coverage: semantics.status,
    application_graph_truncated: application.truncated,
    semantic_graph_truncated: semantics.truncated,
    semantic_unknown_count: semantic.unknowns.length,
    semantic_incomplete_family_count: incompleteFamilies,
    source_unselected_files: unselected,
    parse_failures: parseFailures,
    integrity_contradictions: result.integrity_contradictions.length,
    limitations_count: limitations.length,
    limitations_preview: limitations.slice(0, 8),
    limitations_omitted: Math.max(0, limitations.length - 8),
    static_evidence_state: complete
      ? "REPORTED_COMPLETE_STATIC_ONLY" : "REPORTED_PARTIAL_OR_UNKNOWN",
    native_blockbench: "NOT_EXECUTED",
    runtime_behavior: "NOT_OBSERVED",
    visual_fidelity: "NOT_EVALUATED",
    source_acceptance: "NOT_EVALUATED",
  } as const;
}

export function argsFromCli(argv: string[]) {
  const args = argv[0] === "--" ? argv.slice(1) : argv;
  if (args.length !== 1 && args.length !== 3) {
    throw new Error("USAGE: bun run audit:rea -- ABSOLUTE_TARGET [--retain-evidence ABSOLUTE_OUTPUT_JSON]");
  }
  if (args.length === 3 && args[1] !== "--retain-evidence") {
    throw new Error("REA_AUDIT_ARGS_INVALID: unknown argument.");
  }
  const target = args[0]!;
  const retain = args[2] ?? null;
  if (!isAbsolute(target) || (retain !== null && !isAbsolute(retain))) {
    throw new Error("REA_AUDIT_PATH_INVALID: use absolute paths.");
  }
  const canonical = realpathSync(target);
  const targetStats = statSync(canonical);
  if (!targetStats.isDirectory() && !(targetStats.isFile() && extname(canonical) === ".asar")) {
    throw new Error("REA_AUDIT_TARGET_INVALID: select a JavaScript directory or Electron .asar.");
  }
  if (retain !== null) {
    const root = realpathSync(resolve(import.meta.dir, "../../.."));
    const outputParent = realpathSync(dirname(retain));
    const output = resolve(outputParent, basename(retain));
    const insideRoot = relative(root, output);
    if (insideRoot === "" || (!insideRoot.startsWith(".."+sep) && insideRoot !== ".." && !isAbsolute(insideRoot))) {
      throw new Error("REA_AUDIT_OUTPUT_IN_REPO: keep raw Evidence outside the source checkout.");
    }
    if (output === canonical) throw new Error("REA_AUDIT_OUTPUT_TARGET: refuse to overwrite the analyzed artifact.");
    return { target: canonical, retain: output };
  }
  return { target: canonical, retain: null };
}

async function analyze(target: string, destination: string): Promise<void> {
  const output = openSync(destination, "wx", 0o600);
  try {
    await new Promise<void>((done, fail) => {
      const child = spawn(process.env.REA_BIN || "rea", [
        "analyze-javascript-application", target, "--integrity-policy", "fail", "--json",
      ], { stdio: ["ignore", output, "pipe"], shell: false });
      let diagnostic = "";
      child.stderr?.on("data", (part: Buffer) => {
        // Diagnostics stay private to this process; report only bounded failure class.
        diagnostic = (diagnostic + part.toString("utf8")).slice(-1024);
      });
      child.once("error", () => fail(new Error("REA_EXECUTABLE_UNAVAILABLE: install and verify the trusted REA CLI separately.")));
      child.once("close", (code) => code === 0
        ? done()
        : fail(new Error("REA_ANALYSIS_FAILED: exit " + String(code) +
          (diagnostic ? " (inspect the REA CLI diagnostics locally)" : ""))));
    });
  } finally {
    closeSync(output);
  }
}

async function main() {
  const { target, retain } = argsFromCli(process.argv.slice(2));
  const temp = mkdtempSync(join(tmpdir(), "lazydesigner-rea-"));
  const output = join(temp, "rea-evidence.json");
  try {
    await analyze(target, output);
    const size = statSync(output).size;
    if (size === 0 || size > MAX_EVIDENCE_BYTES) {
      throw new Error("REA_EVIDENCE_SIZE_UNSUPPORTED: inspect the complete output directly with REA.");
    }
    const summary = projectReaStaticEvidence(JSON.parse(readFileSync(output, "utf8")));
    if (retain !== null) {
      copyFileSync(output, retain, 1 /* COPYFILE_EXCL: never clobber a retained Evidence file */);
    }
    process.stdout.write(JSON.stringify({
      ...summary,
      retained_evidence: retain !== null,
    }, null, 2) + "\n");
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "REA_AUDIT_FAILED");
    process.exitCode = 1;
  });
}
