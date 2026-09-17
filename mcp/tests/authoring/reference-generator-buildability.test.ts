import { describe, expect, test } from "bun:test";

async function read(path: string) {
  return (await Bun.file(path).text()).replaceAll("**", "").replace(/\s+/g, " ").toLowerCase();
}

const REFERENCE_SKILL = "../.agents/skills/lazydesigner-reference-preparation/SKILL.md";

describe("LazyDesigner reference preparation contract", () => {
  test("reference generation is gated by blocking requirements and explicit confirmation", async () => {
    const [skill, flow] = await Promise.all([
      read(REFERENCE_SKILL),
      read("../docs/02-reference/flow.md"),
    ]);

    expect(skill).toContain("requirement gate");
    expect(skill).toContain("blocking");
    expect(skill).toContain("final confirmation");
    expect(skill).toContain("silence is not approval");
    expect(flow).toContain("requirement gate");
    expect(flow).toContain("final confirmation");
  });

  test("source images remain evidence while final generated sheets target Minecraft/Blockbench", async () => {
    const [skill, policy, standard] = await Promise.all([
      read(REFERENCE_SKILL),
      read("../docs/02-reference/policy.md"),
      read("../docs/02-reference/image/standard.md"),
    ]);

    expect(policy).toContain("a user-supplied image may already be sufficient");
    expect(skill).toContain("visible source evidence");
    expect(policy).toContain("approved minecraft/blockbench interpretation only");
    expect(standard).toContain("source image = evidence");
    expect(standard).toContain("final production sheet = approved minecraft/blockbench interpretation");
  });

  test("one unified visual system keeps panel detail in the canonical image standard", async () => {
    const [skill, standard] = await Promise.all([
      read(REFERENCE_SKILL),
      read("../docs/02-reference/image/standard.md"),
    ]);

    expect(skill).toContain("standard.md owns panel economy and layout");
    expect(skill).toContain("do not generate every module by default");
    expect(standard).toContain("1 primary reference sheet per asset");
    expect(standard).toContain("geometry_ambiguity");
    expect(standard).toContain("texture_ambiguity");
    expect(standard).toContain("animation_ambiguity");
    expect(standard).toContain("p1");
    expect(standard).toContain("p2");
    expect(standard).toContain("p3");
    expect(standard).toContain("content decides layout");
    expect(standard).not.toContain("five fixed broad preview positions");
  });

  test("construction views are minimum-sufficient rather than a mandatory turnaround ritual", async () => {
    const [policy, standard] = await Promise.all([
      read("../docs/02-reference/policy.md"),
      read("../docs/02-reference/image/standard.md"),
    ]);

    expect(policy).toContain("minimum evidence that materially reduces downstream uncertainty");
    expect(standard).toContain("use minimum sufficient views");
    expect(standard).toContain("right → only when left/right asymmetry matters");
    expect(standard).toContain("top → only when footprint/depth/layout matters");
  });

  test("Minecraft player-relative scale is canonical without inventing exact dimensions", async () => {
    const [skill, scale] = await Promise.all([
      read(REFERENCE_SKILL),
      read("../docs/02-reference/image/scale-and-escalation.md"),
    ]);

    expect(skill).toContain("owns player/world scale");
    expect(skill).toContain("never infer numeric scale from pixels");
    expect(scale).toContain("player_height");
    expect(scale).toContain("rideable_1p");
    expect(scale).toContain("must not invent exact block values");
  });

  test("sheet escalation preserves identity and scale instead of overpacking", async () => {
    const [skill, standard, scale] = await Promise.all([
      read(REFERENCE_SKILL),
      read("../docs/02-reference/image/standard.md"),
      read("../docs/02-reference/image/scale-and-escalation.md"),
    ]);

    expect(skill).toContain("sheet 02+");
    expect(standard).toContain("identity + scale lock / anti-drift");
    expect(standard).toContain("later sheets elaborate rather than redesign");
    expect(scale).toContain("scale lock");
    expect(scale).toContain("remove p3");
    expect(scale).toContain("remove lowest-value p2");
    expect(scale).toContain("sheet 02+");
  });

  test("generation prompting uses compiled state, not raw conversation", async () => {
    const [skill, prompt, templates] = await Promise.all([
      read(REFERENCE_SKILL),
      read("../docs/02-reference/image/prompt-contract.md"),
      read("../docs/02-reference/image/master-templates.md"),
    ]);

    expect(skill).toContain("compiled brief is internal working state");
    expect(prompt).toContain("never generate directly from the raw conversation");
    expect(prompt).toContain("identity lock");
    expect(templates).toContain("template a");
    expect(templates).toContain("template b");
    expect(templates).toContain("template c");
  });

  test("corrections are delta-first and preserve unaffected visual authority", async () => {
    const [skill, prompt] = await Promise.all([
      read(REFERENCE_SKILL),
      read("../docs/02-reference/image/prompt-contract.md"),
    ]);

    expect(skill).toContain("corrections use change + preserve against approved authority");
    expect(prompt).toContain("approved current sheet");
    expect(prompt).toContain("change");
    expect(prompt).toContain("preserve");
  });
});
