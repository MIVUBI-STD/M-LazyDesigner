/**
 * Opt-in, read-only REA artifact audit. This is development evidence, never an
 * authoring tool, live Blockbench verifier, or visual acceptance shortcut.
 *
 * REA CLI: https://github.com/morluto/rea
 * REA executes its analyzer, not the inspected JavaScript application.
 */
import { spawn } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, openSync, closeSync,
  readFileSync, realpathSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";

const MAX_EVIDENCE_BYTES = 64 * 1024 * 1024;
const ID_PATTERN = /^ev_[0-9a-f]{64}$/;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const COVERAGE = ["complete", "partial", "unknown", "unavailable"] as const;
type JsonObject = Record<string, unknown>;

function object(input: unknown): JsonObject | null {
  return input !== null && typeof input === "object" && !Array.isArray(input)
    ? input as JsonObject : null;
}

function coverageState(value: unknown): typeof COVERAGE[number] | "unknown" {
  const state = typeof value === "string" ? value : object(value)?.state;
  return COVERAGE.includes(state as typeof COVERAGE[number])
    ? state as typeof COVERAGE[number] : "unknown";
}

/**
 * Project a small report from REA's complete Evidence. Do NOT recalculate
 * Evidence identifiers: only REA can authenticate the actual Evidence graph.
 * A complete static graph never confers native, runtime, or visual PASS.
 */
export function projectReaStaticEvidence(input: unknown) {
  const envelope = object(input);
  const provider = object(envelope?.provider);
  const subject = object(envelope?.subject);
  const digest = object(subject?.digest);
  const result = object(envelope?.normalized_result);
  const graph = object(result?.application_graph);
  if (!envelope || !ID_PATTERN.test(String(envelope.evidence_id ?? "")) ||
      envelope.operation !== "analyze_javascript_application" ||
      !provider || typeof provider.name !== "string" ||
      !subject || !DIGEST_PATTERN.test(String(digest?.sha256 ?? "")) ||
      (subject.format !== "directory" && subject.format !== "asar") ||
      !result) {
    throw new Error("REA_EVIDENCE_INVALID: expected a JavaScript application Evidence record with a target digest.");
  }
  if (!Array.isArray(envelope.limitations) ||
      envelope.limitations.some((item: unknown) => typeof item !== "string")) {
    throw new Error("REA_EVIDENCE_INVALID: missing or malformed analysis limitations.");
  }
  const limitations = envelope.limitations as string[];
  // No claim of complete graph coverage when that property was not supplied.
  const coverage = coverageState(graph?.coverage);
  return {
    schema: "lazydesigner-rea-static-audit-v1",
    evidence_id: envelope.evidence_id,
    evidence_id_check: "FORMAT_ONLY_REA_OWNS_AUTHENTICATION",
    provider: {
      name: provider.name,
      version: typeof provider.version === "string" ? provider.version : null,
    },
    artifact: { sha256: digest!.sha256, format: subject.format },
    application_graph_coverage: coverage,
    limitations_count: limitations.length,
    limitations_preview: limitations.slice(0, 8),
    limitations_omitted: Math.max(0, limitations.length - 8),
    static_evidence_state: coverage === "complete" && limitations.length === 0
      ? "AVAILABLE_NOT_ACCEPTANCE" : "PARTIAL_OR_UNKNOWN",
    native_blockbench: "NOT_EXECUTED",
    runtime_behavior: "NOT_OBSERVED",
    visual_fidelity: "NOT_EVALUATED",
    source_acceptance: "NOT_EVALUATED",
  } as const;
}

function argsFromCli(argv: string[]) {
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
    const output = resolve(outputParent, retain.substring(dirname(retain).length + 1));
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
