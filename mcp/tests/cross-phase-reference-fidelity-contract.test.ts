import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

async function repoFile(path: string): Promise<string> {
  return readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

function normalized(value: string): string {
  return value.replace(/\s+/g, " ").toLowerCase();
}

describe("cross-phase reference fidelity contract", () => {
  test("shared stage context keeps one authority chain and evidence boundaries", async () => {
    const shared = normalized(
      await repoFile("docs/04-system/authoring-stage-context.md")
    );

    expect(shared).toContain("## authority");
    expect(shared).toContain("explicit current user requirement");
    expect(shared).toContain("approved/current visual reference evidence");
    expect(shared).toContain("persisted approved asset state");
    expect(shared).toContain("specialist technical evidence");
    expect(shared).toContain("unresolved remains unknown");
    expect(shared).toContain("do not create visual acceptance or user approval");
  });

  test("texturing preserves geometry ownership and judges mapped-surface fidelity", async () => {
    const source = normalized(
      await Promise.all([repoFile(".agents/skills/lazydesigner-texturing/SKILL.md"), repoFile(".agents/skills/lazydesigner-texturing/references/fidelity-styling-verification.md")]).then((parts) => parts.join("\n"))
    );

    expect(source).toContain("reference fidelity contract");
    expect(source).toContain("mapped-surface-first");
    expect(source).toContain("must not paint around a missing/incorrect mass");
    expect(source).toContain("wrong/missing identity marking");
    expect(source).toContain("mapped model introduces a material seam");
  });

  test("animation uses reference poses but refuses to compensate for a wrong rig", async () => {
    const source = normalized(
      await Promise.all([repoFile(".agents/skills/lazydesigner-animation/SKILL.md"), repoFile(".agents/skills/lazydesigner-animation/references/fidelity-correction-evidence.md")]).then((parts) => parts.join("\n"))
    );

    expect(source).toContain("keyframe reference fidelity contract");
    expect(source).toContain("geometry remains authority for actual bone hierarchy");
    expect(source).toContain("pose-correspondence-first");
    expect(source).toContain("excessive joint gap");
    expect(source).toContain("stop animation and hand off to geometry");
  });

  test("reference fidelity remains qualitative and first-cause ordered across phases", async () => {
    const geometry = normalized(
      await Promise.all([repoFile(".agents/skills/lazydesigner-modelling/SKILL.md"), repoFile(".agents/skills/lazydesigner-modelling/references/verification.md"), repoFile(".agents/skills/lazydesigner-modelling/references/correction.md")]).then((parts) => parts.join("\n"))
    );
    const texturing = normalized(
      await Promise.all([repoFile(".agents/skills/lazydesigner-texturing/SKILL.md"), repoFile(".agents/skills/lazydesigner-texturing/references/fidelity-styling-verification.md")]).then((parts) => parts.join("\n"))
    );
    const animation = normalized(
      await Promise.all([repoFile(".agents/skills/lazydesigner-animation/SKILL.md"), repoFile(".agents/skills/lazydesigner-animation/references/fidelity-correction-evidence.md")]).then((parts) => parts.join("\n"))
    );

    expect(geometry).toContain("correct first cause");
    expect(texturing).toContain("prioritize correction by visible identity impact");
    expect(animation).toContain("prioritize correction by motion impact");
    expect(animation).toContain("do not use an animation quality score");
  });
});
