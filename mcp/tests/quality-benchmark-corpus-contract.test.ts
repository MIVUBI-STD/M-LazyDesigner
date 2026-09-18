import { describe, expect, test } from "bun:test";

type RegressionCase = {
  id: string;
  surface: string;
  failure: string;
  invariant: string;
  regression_test: string;
  status: "REGRESSION_GUARDED";
};

type GoldenTask = {
  id: string;
  profile: string;
  request: string;
  phases: string[];
  acceptance: string[];
  execution_state: "UNMEASURED";
};

describe("quality benchmark corpus contracts", () => {
  test("regression corpus contains only real guarded incidents with explicit proof owners", async () => {
    const corpus = await Bun.file("tests/fixtures/regression-cases.json").json() as { schema: string; cases: RegressionCase[] };
    expect(corpus.schema).toBe("lazydesigner-regression-corpus-v1");
    expect(corpus.cases.length).toBeGreaterThanOrEqual(8);
    expect(new Set(corpus.cases.map((entry) => entry.id)).size).toBe(corpus.cases.length);
    for (const entry of corpus.cases) {
      expect(entry.id.length).toBeGreaterThan(6);
      expect(entry.surface.length).toBeGreaterThan(2);
      expect(entry.failure.length).toBeGreaterThan(12);
      expect(entry.invariant.length).toBeGreaterThan(12);
      expect(entry.regression_test).toMatch(/^tests\\/.+\\.test\\.ts$/);
      expect(await Bun.file(entry.regression_test).exists(), entry.regression_test).toBe(true);
      expect(entry.status).toBe("REGRESSION_GUARDED");
    }
  });

  test("golden task corpus stays unmeasured until real live authoring evidence exists", async () => {
    const corpus = await Bun.file("tests/fixtures/golden-task-cases.json").json() as { schema: string; policy: { execution_state: string }; tasks: GoldenTask[] };
    expect(corpus.schema).toBe("lazydesigner-golden-tasks-v1");
    expect(corpus.policy.execution_state).toBe("UNMEASURED");
    expect(corpus.tasks).toHaveLength(8);
    expect(new Set(corpus.tasks.map((entry) => entry.id)).size).toBe(corpus.tasks.length);
    for (const task of corpus.tasks) {
      expect(task.request.length).toBeGreaterThan(24);
      expect(task.phases.length).toBeGreaterThan(0);
      expect(task.acceptance.length).toBeGreaterThanOrEqual(4);
      expect(task.execution_state).toBe("UNMEASURED");
      expect(task).not.toHaveProperty("score");
      expect(task).not.toHaveProperty("pass");
      expect(task).not.toHaveProperty("accepted");
    }
  });
});
