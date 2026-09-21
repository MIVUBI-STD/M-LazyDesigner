import { describe, expect, test } from "bun:test";
import { IncrementalQueryEngine } from "../lib/semantic/incremental";

describe("incremental semantic query engine", () => {
  test("reuses a query while all dependency revisions stay current", () => {
    const engine = new IncrementalQueryEngine();
    engine.setInput("a", 2, "a:1");
    engine.setInput("b", 3, "b:1");
    engine.defineQuery("sum", {
      compute: (ctx) => ctx.input<number>("a") + ctx.input<number>("b"),
      fingerprint: (value) => `sum:${value}`,
    });

    expect(engine.run<number>("sum").value).toBe(5);
    const second = engine.run<number>("sum");
    expect(second.reused).toBe(true);
    expect(engine.stats().computations).toBe(1);
    expect(engine.stats().cache_hits).toBeGreaterThanOrEqual(1);
  });

  test("early cutoff keeps downstream query reusable when semantic output is unchanged", () => {
    const engine = new IncrementalQueryEngine();
    let parentComputations = 0;

    engine.setInput("raw", 2, "raw:1");
    engine.defineQuery("parity", {
      compute: (ctx) => ctx.input<number>("raw") % 2,
      fingerprint: (value) => `parity:${value}`,
    });
    engine.defineQuery("parent", {
      compute: (ctx) => {
        parentComputations += 1;
        return ctx.query<number>("parity") === 0 ? "even" : "odd";
      },
      fingerprint: (value) => `parent:${value}`,
    });

    expect(engine.run<string>("parent").value).toBe("even");
    expect(parentComputations).toBe(1);

    engine.setInput("raw", 4, "raw:2");
    const parent = engine.run<string>("parent");

    expect(parent.value).toBe("even");
    expect(parent.reused).toBe(true);
    expect(parentComputations).toBe(1);
    expect(engine.stats().early_cutoffs).toBeGreaterThanOrEqual(1);
  });

  test("recomputes downstream when a dependency semantic revision changes", () => {
    const engine = new IncrementalQueryEngine();
    engine.setInput("raw", 2, "raw:1");
    engine.defineQuery("value", {
      compute: (ctx) => ctx.input<number>("raw"),
      fingerprint: (value) => `value:${value}`,
    });
    engine.defineQuery("double", {
      compute: (ctx) => ctx.query<number>("value") * 2,
      fingerprint: (value) => `double:${value}`,
    });

    expect(engine.run<number>("double").value).toBe(4);
    engine.setInput("raw", 3, "raw:2");
    const changed = engine.run<number>("double");

    expect(changed.value).toBe(6);
    expect(changed.reused).toBe(false);
  });

  test("fails closed on dependency cycles", () => {
    const engine = new IncrementalQueryEngine();
    engine.defineQuery("a", {
      compute: (ctx) => ctx.query("b"),
      fingerprint: String,
    });
    engine.defineQuery("b", {
      compute: (ctx) => ctx.query("a"),
      fingerprint: String,
    });

    expect(() => engine.run("a")).toThrow(/cycle detected/);
  });
});
