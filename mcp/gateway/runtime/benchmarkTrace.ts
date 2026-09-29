import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export type BenchmarkTraceKind =
  | "search"
  | "describe"
  | "inspect"
  | "mutate"
  | "verify";

export type BenchmarkTraceEvent = {
  schema: "lazydesigner-gateway-benchmark-trace-v1";
  sequence: number;
  task_id: string;
  source_sha: string;
  timestamp: string;
  kind: BenchmarkTraceKind;
  capability: string | null;
  success: boolean;
  latency_ms: number;
  result_bytes: number | null;
  read_only: boolean | null;
  verification_class: string | null;
};

type BenchmarkTraceRecorderOptions = {
  path: string;
  taskId: string;
  sourceSha: string;
};

function payloadBytes(value: unknown): number | null {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return null;
  }
}

function elapsedMs(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}

export class BenchmarkTraceRecorder {
  private sequence = 0;
  private writeTail: Promise<void> = Promise.resolve();

  private constructor(
    private readonly options: BenchmarkTraceRecorderOptions | null
  ) {}

  static fromEnvironment(
    env: Record<string, string | undefined> = process.env
  ): BenchmarkTraceRecorder {
    const path = env.LAZYDESIGNER_BENCHMARK_TRACE_PATH;
    if (!path) return new BenchmarkTraceRecorder(null);

    const taskId = env.LAZYDESIGNER_BENCHMARK_TASK_ID;
    const sourceSha = env.LAZYDESIGNER_BENCHMARK_SOURCE_SHA;
    if (!taskId) {
      throw new Error(
        "LAZYDESIGNER_BENCHMARK_TASK_ID is required when benchmark trace capture is enabled."
      );
    }
    if (!sourceSha || !/^[0-9a-f]{40}$/.test(sourceSha)) {
      throw new Error(
        "LAZYDESIGNER_BENCHMARK_SOURCE_SHA must be an exact 40-character Git SHA when benchmark trace capture is enabled."
      );
    }

    return new BenchmarkTraceRecorder({ path, taskId, sourceSha });
  }

  get enabled(): boolean {
    return this.options !== null;
  }

  startedAt(): number {
    return Date.now();
  }

  record(input: {
    startedAt: number;
    kind: BenchmarkTraceKind;
    capability?: string | null;
    success: boolean;
    result?: unknown;
    readOnly?: boolean | null;
    verificationClass?: string | null;
  }): void {
    if (!this.options) return;

    const event: BenchmarkTraceEvent = {
      schema: "lazydesigner-gateway-benchmark-trace-v1",
      sequence: this.sequence++,
      task_id: this.options.taskId,
      source_sha: this.options.sourceSha,
      timestamp: new Date().toISOString(),
      kind: input.kind,
      capability: input.capability ?? null,
      success: input.success,
      latency_ms: elapsedMs(input.startedAt),
      result_bytes:
        input.result === undefined ? null : payloadBytes(input.result),
      read_only: input.readOnly ?? null,
      verification_class: input.verificationClass ?? null,
    };

    const path = this.options.path;
    this.writeTail = this.writeTail
      .then(async () => {
        await mkdir(dirname(path), { recursive: true });
        await appendFile(path, JSON.stringify(event) + "\n", "utf8");
      })
      .catch((error) => {
        console.error(
          "[LazyDesigner Gateway] benchmark trace write failed:",
          error instanceof Error ? error.message : String(error)
        );
      });
  }

  async flush(): Promise<void> {
    await this.writeTail;
  }
}
