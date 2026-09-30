import type {
  BenchmarkTraceEvent,
  BenchmarkTraceKind,
} from "../../gateway/runtime/benchmarkTrace";

function parseTrace(text: string): BenchmarkTraceEvent[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    throw new Error("Benchmark trace is empty.");
  }

  return lines.map((line, index) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error(`Trace line ${index + 1} is not valid JSON.`);
    }
    if (!parsed || typeof parsed !== "object") {
      throw new Error(`Trace line ${index + 1} must be an object.`);
    }
    const event = parsed as BenchmarkTraceEvent;
    if (event.schema !== "lazydesigner-gateway-benchmark-trace-v1") {
      throw new Error(`Trace line ${index + 1} has an unsupported schema.`);
    }
    if (!Number.isInteger(event.sequence) || event.sequence < 0) {
      throw new Error(`Trace line ${index + 1} has an invalid sequence.`);
    }
    if (typeof event.task_id !== "string" || event.task_id.length === 0) {
      throw new Error(`Trace line ${index + 1} has an invalid task_id.`);
    }
    if (!/^[0-9a-f]{40}$/.test(event.source_sha)) {
      throw new Error(`Trace line ${index + 1} has an invalid source_sha.`);
    }
    return event;
  });
}

function sum(values: readonly (number | null)[]): number | null {
  if (values.some((value) => value === null)) return null;
  return values.reduce<number>(
    (total, value) => total + (value ?? 0),
    0
  );
}

function count(
  events: readonly BenchmarkTraceEvent[],
  kind: BenchmarkTraceKind
): number {
  return events.filter((event) => event.kind === kind).length;
}

export function summarizeGatewayBenchmarkTrace(text: string) {
  const events = parseTrace(text);
  const taskIds = new Set(events.map((event) => event.task_id));
  const sourceShas = new Set(events.map((event) => event.source_sha));
  if (taskIds.size !== 1) {
    throw new Error("Benchmark trace must contain exactly one task_id.");
  }
  if (sourceShas.size !== 1) {
    throw new Error("Benchmark trace must contain exactly one source_sha.");
  }

  const ordered = [...events].sort((a, b) => a.sequence - b.sequence);
  for (let index = 0; index < ordered.length; index += 1) {
    if (ordered[index]!.sequence !== index) {
      throw new Error(
        `Benchmark trace sequence must be contiguous from 0; expected ${index}.`
      );
    }
  }

  const failed = ordered.filter((event) => !event.success);
  return {
    schema: 1,
    report: "gateway-benchmark-trace",
    proof_scope:
      "Objective Gateway execution metadata only. This report does not prove accepted-result quality, reference fidelity, or live visual correctness.",
    task_id: ordered[0]!.task_id,
    source_sha: ordered[0]!.source_sha,
    calls: {
      total: ordered.length,
      search: count(ordered, "search"),
      describe: count(ordered, "describe"),
      inspect: count(ordered, "inspect"),
      mutate: count(ordered, "mutate"),
      verify: count(ordered, "verify"),
      recovery: count(ordered, "recovery"),
      failed: failed.length,
    },
    payload: {
      result_bytes: sum(ordered.map((event) => event.result_bytes)),
    },
    latency: {
      total_ms: ordered.reduce((total, event) => total + event.latency_ms, 0),
      max_ms: Math.max(...ordered.map((event) => event.latency_ms)),
    },
    capabilities: [...new Set(
      ordered
        .map((event) => event.capability)
        .filter((value): value is string => value !== null)
    )],
    events: ordered,
  };
}

async function main(): Promise<void> {
  const path = process.argv[2];
  if (!path) {
    throw new Error(
      "Usage: bun run report:gateway-trace -- <gateway-trace.ndjson>"
    );
  }
  const file = Bun.file(path);
  if (!(await file.exists())) throw new Error(`Trace file not found: ${path}`);
  console.log(
    JSON.stringify(summarizeGatewayBenchmarkTrace(await file.text()), null, 2)
  );
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}