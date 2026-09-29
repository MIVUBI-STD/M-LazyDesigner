import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

async function repoFile(path: string): Promise<string> {
  return readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

function normalized(value: string): string {
  return value.replace(/\s+/g, " ").toLowerCase();
}

describe("LazyDesigner correction convergence contract", () => {
  test("shared stage owner enforces one-cause correction and bounded retries", async () => {
    const shared = normalized(
      await repoFile("docs/04-system/authoring-stage-context.md")
    );

    expect(shared).toContain("correction / convergence");
    expect(shared).toContain("one diagnosed cause");
    expect(shared).toContain("reuse fresh state/evidence");
    expect(shared).toContain("one bounded coherent mutation");
    expect(shared).toContain("same causal direction failing twice without new evidence");
    expect(shared).toMatch(/becomes `?blocked`? rather than a third guess/);
  });

  test("geometry reuses exact state and blocks repeated same-cause correction", async () => {
    const geometry = normalized(
      await repoFile(".agents/skills/lazydesigner-modelling/SKILL.md")
    );

    expect(geometry).toContain("local correction / convergence");
    expect(geometry).toContain("reuse fresh exact authored state");
    expect(geometry).toContain("recapture only affected evidence");
    expect(geometry).toContain("same causal direction failing twice without new evidence");
  });

  test("texturing refreshes only stale evidence and does not guess a third variant", async () => {
    const texturing = normalized(
      await repoFile(".agents/skills/lazydesigner-texturing/SKILL.md")
    );

    expect(texturing).toContain("correction convergence");
    expect(texturing).toContain("one visible cause owns one correction round");
    expect(texturing).toContain("refresh only the evidence class made stale");
    expect(texturing).toContain("same texture-owned causal direction twice without new evidence");
    expect(texturing).toContain("do not produce a third palette/pattern variation as guesswork");
  });

  test("animation reuses timeline state and refuses denser-key retry loops", async () => {
    const animation = normalized(
      await repoFile(".agents/skills/lazydesigner-animation/SKILL.md")
    );

    expect(animation).toContain("correction convergence");
    expect(animation).toContain("one diagnosed motion cause");
    expect(animation).toContain("fresh timeline mutation receipt remains authoritative");
    expect(animation).toContain("same causal direction fails twice without new evidence");
    expect(animation).toContain("do not add denser keys");
  });
});
