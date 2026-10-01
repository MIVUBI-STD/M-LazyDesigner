import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BenchmarkTraceRecorder } from "./benchmarkTrace";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("Gateway benchmark trace recorder", () => {
  test("is a zero-write no-op unless explicitly enabled", async () => {
    const recorder = BenchmarkTraceRecorder.fromEnvironment({});
    expect(recorder.enabled).toBe(false);

    recorder.record({
      startedAt: recorder.startedAt(),
      kind: "search",
      success: true,
      result: { secret: "must-not-write" },
    });
    await recorder.flush();
  });

  test("fails closed when an enabled trace lacks task or exact source identity", () => {
    expect(() =>
      BenchmarkTraceRecorder.fromEnvironment({
        LAZYDESIGNER_BENCHMARK_TRACE_PATH: "/tmp/trace.ndjson",
      })
    ).toThrow("LAZYDESIGNER_BENCHMARK_TASK_ID");

    expect(() =>
      BenchmarkTraceRecorder.fromEnvironment({
        LAZYDESIGNER_BENCHMARK_TRACE_PATH: "/tmp/trace.ndjson",
        LAZYDESIGNER_BENCHMARK_TASK_ID: "golden-prop-chair",
        LAZYDESIGNER_BENCHMARK_SOURCE_SHA: "not-a-sha",
      })
    ).toThrow("exact 40-character Git SHA");
  });

  test("writes ordered metadata only and never persists result contents", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lazydesigner-trace-"));
    temporaryDirectories.push(dir);
    const path = join(dir, "trace.ndjson");
    const recorder = BenchmarkTraceRecorder.fromEnvironment({
      LAZYDESIGNER_BENCHMARK_TRACE_PATH: path,
      LAZYDESIGNER_BENCHMARK_TASK_ID: "golden-existing-model-correction",
      LAZYDESIGNER_BENCHMARK_SOURCE_SHA:
        "1234567890abcdef1234567890abcdef12345678",
    });

    recorder.record({
      startedAt: recorder.startedAt(),
      kind: "inspect",
      capability: "inspect_elements",
      success: true,
      result: {
        secret_reference_path: "C:/private/reference.png",
        structuredContent: { sensitive: "do-not-persist" },
      },
      readOnly: true,
      verificationClass: "focused_read",
    });
    recorder.record({
      startedAt: recorder.startedAt(),
      kind: "mutate",
      capability: "manage_cubes",
      success: true,
      result: { execution: "applied" },
      readOnly: false,
      verificationClass: "visual",
    });
    await recorder.flush();

    const raw = await readFile(path, "utf8");
    expect(raw).not.toContain("private/reference.png");
    expect(raw).not.toContain("do-not-persist");

    const events = raw
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.sequence)).toEqual([0, 1]);
    expect(events[0]).toMatchObject({
      schema: "lazydesigner-gateway-benchmark-trace-v1",
      task_id: "golden-existing-model-correction",
      source_sha: "1234567890abcdef1234567890abcdef12345678",
      kind: "inspect",
      capability: "inspect_elements",
      success: true,
      read_only: true,
      verification_class: "focused_read",
    });
    expect(events[0].result_bytes).toBeGreaterThan(0);
  });
});
