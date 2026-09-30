import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import goldenCorpus from "../../tests/fixtures/golden-task-cases.json";
import {
  summarizeGatewayBenchmarkTrace,
} from "./summarize-gateway-benchmark-trace";
import type {
  GoldenAuthoringDocument,
  GoldenTraceEvent,
} from "./evaluate-golden-authoring-runs";
import type { BenchmarkTraceEvent } from "../../gateway/runtime/benchmarkTrace";

type GoldenTask = (typeof goldenCorpus.tasks)[number];

export type GoldenSessionPaths = {
  directory: string;
  trace: string;
  trace_report: string;
  golden_run_draft: string;
};

function exactGitSha(): string {
  const result = Bun.spawnSync(["git", "rev-parse", "HEAD"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(
      `Could not resolve current Git SHA: ${result.stderr.toString().trim()}`
    );
  }
  const sha = result.stdout.toString().trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) {
    throw new Error("Current Git HEAD is not an exact 40-character SHA.");
  }
  return sha;
}

function taskById(taskId: string): GoldenTask {
  const task = goldenCorpus.tasks.find((entry) => entry.id === taskId);
  if (!task) {
    throw new Error(
      `Unknown golden task "${taskId}". Available: ${goldenCorpus.tasks
        .map((entry) => entry.id)
        .join(", ")}`
    );
  }
  return task;
}

function safeTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function goldenSessionPaths(
  taskId: string,
  outputRoot = ".cache/golden-sessions",
  startedAt = new Date()
): GoldenSessionPaths {
  const directory = resolve(
    outputRoot,
    `${taskId}-${safeTimestamp(startedAt)}`
  );
  return {
    directory,
    trace: join(directory, "trace.ndjson"),
    trace_report: join(directory, "trace-report.json"),
    golden_run_draft: join(directory, "golden-run-draft.json"),
  };
}

export function buildGoldenRunDraft(input: {
  task: GoldenTask;
  sourceSha: string;
  traceEvents: readonly BenchmarkTraceEvent[];
  wallTimeMs: number;
}): GoldenAuthoringDocument {
  const trace: GoldenTraceEvent[] = input.traceEvents.map((event) => ({
    index: event.sequence,
    kind: event.kind,
    ...(event.capability ? { capability: event.capability } : {}),
    required_for_decision: null,
    result_bytes: event.result_bytes,
    latency_ms: event.latency_ms,
  }));

  return {
    schema: "lazydesigner-golden-authoring-runs-v1",
    runs: [
      {
        task_id: input.task.id,
        source_sha: input.sourceSha,
        proof_scope: "LIVE_BLOCKBENCH",
        model: null,
        pipeline_provenance: {
          reference_package_fingerprint: null,
          control_task_context_id: null,
          runtime_build_identity: null,
          artifact_revision: null,
        },
        quality_verdict: "UNVERIFIED",
        accepted_result: null,
        user_corrections: null,
        correction_rounds: null,
        wall_time_ms: input.wallTimeMs,
        accepted_result_ms: null,
        token_usage: {
          total_tokens: null,
          input_tokens: null,
          cached_input_tokens: null,
          output_tokens: null,
          reasoning_tokens: null,
        },
        trace,
        acceptance_evidence: input.task.acceptance.map((criterion) => ({
          criterion,
          verdict: "UNVERIFIED",
          evidence_ref: null,
        })),
      },
    ],
  };
}

async function finalizeSession(input: {
  task: GoldenTask;
  sourceSha: string;
  paths: GoldenSessionPaths;
  startedAtMs: number;
}): Promise<void> {
  const traceFile = Bun.file(input.paths.trace);
  if (!(await traceFile.exists())) {
    console.error(
      "[LazyDesigner Benchmark] No trace file was produced; no report/draft generated."
    );
    return;
  }

  const traceText = await traceFile.text();
  const report = summarizeGatewayBenchmarkTrace(traceText);
  const wallTimeMs = Math.max(0, Date.now() - input.startedAtMs);
  const draft = buildGoldenRunDraft({
    task: input.task,
    sourceSha: input.sourceSha,
    traceEvents: report.events,
    wallTimeMs,
  });

  await Bun.write(
    input.paths.trace_report,
    JSON.stringify(report, null, 2) + "\n"
  );
  await Bun.write(
    input.paths.golden_run_draft,
    JSON.stringify(draft, null, 2) + "\n"
  );

  console.error(
    `[LazyDesigner Benchmark] Session artifacts: ${input.paths.directory}`
  );
  console.error(
    "[LazyDesigner Benchmark] Draft remains UNVERIFIED; add complete Reference → Control → Runtime → artifact provenance, decision labels, and acceptance evidence before claiming accepted-result efficiency."
  );
}

async function main(): Promise<void> {
  const taskId = process.argv[2];
  const outputRoot = process.argv[3] ?? ".cache/golden-sessions";
  if (!taskId) {
    throw new Error(
      "Usage: bun run benchmark:golden-session -- <golden-task-id> [output-root]"
    );
  }

  const task = taskById(taskId);
  const sourceSha = exactGitSha();
  const paths = goldenSessionPaths(task.id, outputRoot);
  await mkdir(paths.directory, { recursive: true });

  const startedAtMs = Date.now();
  const child = Bun.spawn(["bun", "run", "./gateway/index.ts"], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: {
      ...process.env,
      LAZYDESIGNER_BENCHMARK_TRACE_PATH: paths.trace,
      LAZYDESIGNER_BENCHMARK_TASK_ID: task.id,
      LAZYDESIGNER_BENCHMARK_SOURCE_SHA: sourceSha,
    },
  });

  let stopping = false;
  const forwardSignal = (signal: NodeJS.Signals) => {
    if (stopping) return;
    stopping = true;
    child.kill(signal);
  };
  process.once("SIGINT", () => forwardSignal("SIGINT"));
  process.once("SIGTERM", () => forwardSignal("SIGTERM"));

  const exitCode = await child.exited;
  await finalizeSession({
    task,
    sourceSha,
    paths,
    startedAtMs,
  });

  process.exitCode = exitCode;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(
      "[LazyDesigner Benchmark]",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  });
}