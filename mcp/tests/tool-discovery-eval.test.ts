import { describe, expect, test } from "bun:test";

type Metrics = {
  top_1_accuracy: number;
  top_3_recall: number;
  top_8_recall: number;
  mean_reciprocal_rank: number;
};

type RawReport = {
  proxy_note: string;
  upstream_reference: { commit: string; default_limit: number };
  enabled_tool_count: number;
  expected_tool_count: number;
  case_count: number;
  missing_expected_tools: string[];
  metrics: Metrics;
  collision_pairs: unknown[];
  top_8_misses: unknown[];
};

type PhaseReport = {
  surface_tool_count: number;
  case_count: number;
  expected_tool_count: number;
  metrics: Metrics;
  collision_pairs: unknown[];
  top_8_misses: unknown[];
};

type RoutedReport = {
  proxy_note: string;
  upstream_reference: { commit: string; default_limit: number };
  routed_query_contract: string;
  routed_query_note: string;
  phase_surface_contract: string;
  catalog_enabled_tool_count: number;
  case_count: number;
  phase_reports: Record<"geometry" | "texturing" | "animation", PhaseReport>;
};

function runEval<T>(script: string): T {
  const result = Bun.spawnSync({
    cmd: [process.execPath, "run", script],
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = result.stdout.toString();
  const stderr = result.stderr.toString();
  expect(result.exitCode, stderr || stdout).toBe(0);
  return JSON.parse(stdout) as T;
}

function weightedMetric(
  reports: PhaseReport[],
  metric: keyof Metrics
): number {
  const total = reports.reduce((sum, report) => sum + report.case_count, 0);
  return reports.reduce(
    (sum, report) => sum + report.metrics[metric] * report.case_count,
    0
  ) / total;
}

describe("tool discovery eval", () => {
  test("separates raw semantic stress from phase-scoped routed spec loading", () => {
    const raw = runEval<RawReport>("./scripts/evaluate/evaluate-tool-discovery.ts");
    const routed = runEval<RoutedReport>("./scripts/evaluate/evaluate-routed-tool-loading.ts");
    const phaseReports = Object.values(routed.phase_reports);

    const routedMetrics = {
      top_1_accuracy: weightedMetric(phaseReports, "top_1_accuracy"),
      top_3_recall: weightedMetric(phaseReports, "top_3_recall"),
      top_8_recall: weightedMetric(phaseReports, "top_8_recall"),
      mean_reciprocal_rank: weightedMetric(
        phaseReports,
        "mean_reciprocal_rank"
      ),
    };

    console.log(
      JSON.stringify(
        {
          tool_discovery_eval: {
            upstream_commit: raw.upstream_reference.commit,
            enabled_tools: raw.enabled_tool_count,
            cases: raw.case_count,
            raw_semantic_stress: raw.metrics,
            routed_phase_scoped_loading: routedMetrics,
            phase_reports: routed.phase_reports,
            top_raw_collisions: raw.collision_pairs.slice(0, 10),
          },
        },
        null,
        2
      )
    );

    expect(raw.enabled_tool_count).toBe(54);
    expect(raw.expected_tool_count).toBe(38);
    expect(raw.case_count).toBe(108);
    expect(raw.missing_expected_tools).toEqual([]);
    expect(raw.upstream_reference.default_limit).toBe(8);
    expect(raw.proxy_note).toContain("not installed-client proof");

    expect(routed.catalog_enabled_tool_count).toBe(raw.enabled_tool_count);
    expect(routed.case_count).toBe(raw.case_count);
    expect(routed.upstream_reference.commit).toBe(raw.upstream_reference.commit);
    expect(routed.routed_query_contract).toBe("<exact_selected_tool_name>");
    expect(routed.routed_query_note).toContain("exact selected tool name");
    expect(routed.phase_surface_contract).toContain("Core tools use default Geometry");
    expect(routed.proxy_note).toContain("not installed-client proof");

    expect(
      phaseReports.reduce((sum, report) => sum + report.case_count, 0)
    ).toBe(raw.case_count);
    for (const report of phaseReports) {
      expect(report.surface_tool_count).toBeGreaterThan(0);
      expect(report.case_count).toBeGreaterThan(0);
      expect(report.expected_tool_count).toBeGreaterThan(0);
      expect(report.top_8_misses).toEqual([]);
      expect(report.metrics.top_8_recall).toBe(1);
    }

    // Animation is deliberately narrow enough that every routed exact-capability
    // query must resolve first on the current static proxy. This locks the
    // create_animation/create_project and inspect_animation/inspect_elements
    // collisions that motivated the Animation efficiency pass.
    expect(routed.phase_reports.animation.surface_tool_count).toBe(18);
    expect(routed.phase_reports.animation.metrics.top_1_accuracy).toBe(1);
    expect(routed.phase_reports.animation.metrics.top_3_recall).toBe(1);
    expect(routed.phase_reports.animation.metrics.top_8_recall).toBe(1);
    expect(routed.phase_reports.animation.metrics.mean_reciprocal_rank).toBe(1);
    expect(routed.phase_reports.animation.collision_pairs).toEqual([]);

    expect(routedMetrics.top_1_accuracy).toBeGreaterThanOrEqual(0.83);
    expect(routedMetrics.top_3_recall).toBeGreaterThanOrEqual(0.93);
    expect(routedMetrics.top_8_recall).toBe(1);
    expect(routedMetrics.mean_reciprocal_rank).toBeGreaterThanOrEqual(0.89);
    expect(routedMetrics.top_1_accuracy).toBeGreaterThan(raw.metrics.top_1_accuracy);
    expect(routedMetrics.top_3_recall).toBeGreaterThan(raw.metrics.top_3_recall);
    expect(routedMetrics.mean_reciprocal_rank).toBeGreaterThan(
      raw.metrics.mean_reciprocal_rank
    );
  });
});