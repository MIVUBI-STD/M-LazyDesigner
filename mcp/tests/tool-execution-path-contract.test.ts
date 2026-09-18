import { describe, expect, test } from "bun:test";
import { getCapabilityMetadata } from "../lib/capabilityMetadata";
import {
  classifyMcpToolPhaseByName,
  isMcpToolExposedForPhase,
} from "../lib/authoringPhase";

async function text(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("tool execution path contract", () => {
  test("generic UI automation remains maintenance-only", () => {
    for (const capability of [
      "trigger_action",
      "emulate_clicks",
      "fill_dialog",
      "risky_eval",
      "from_geo_json",
    ]) {
      expect(getCapabilityMetadata(capability).tier).toBe("maintenance");
    }
  });

  test("normal semantic authoring capabilities stay above maintenance", () => {
    for (const capability of [
      "manage_cubes",
      "paint_with_brush",
      "paint_texture_transaction",
      "create_animation",
      "manage_animation_timeline",
      "manage_particle",
      "export_model",
    ]) {
      expect(getCapabilityMetadata(capability).tier).not.toBe("maintenance");
    }
  });

  test("texture state helpers do not outrank semantic authoring tools", () => {
    expect(getCapabilityMetadata("activate_texture").tier).toBe("support");
    expect(getCapabilityMetadata("apply_texture").tier).toBe("support");
    expect(getCapabilityMetadata("create_texture").tier).toBe("primary");
    expect(getCapabilityMetadata("paint_texture_transaction").tier).toBe("primary");
  });

  test("editor selection helpers stay in AUTHORING and out of Animation", () => {
    for (const capability of ["select_all_of_type", "get_selection"]) {
      expect(classifyMcpToolPhaseByName(capability)).toBe("geometry");
      expect(isMcpToolExposedForPhase(capability, "elements", "geometry")).toBe(true);
      expect(isMcpToolExposedForPhase(capability, "elements", "texturing")).toBe(true);
      expect(isMcpToolExposedForPhase(capability, "elements", "animation")).toBe(false);
    }
  });

  test("mouse and generic dialog emulation stay isolated from representative normal owners", async () => {
    const [ui, cubes, paint, animation, particle] = await Promise.all([
      text("server/tools/ui.ts"),
      text("server/tools/cubes.ts"),
      Promise.all([text("server/tools/paint-brush.ts"), text("server/tools/paint-primitives.ts")]).then((parts) => parts.join("\n")),
      text("server/tools/animation-timeline.ts"),
      text("server/tools/particle.ts"),
    ]);

    expect(ui).toContain('new MouseEvent("click"');
    expect(ui).toContain("Dialog.open?.setFormValues");

    for (const source of [cubes, paint, animation, particle]) {
      expect(source).not.toContain('new MouseEvent("click"');
      expect(source).not.toContain("Dialog.open?.setFormValues");
    }
  });

  test("native Painter and Timeline use subsystem APIs rather than mouse emulation", async () => {
    const [paint, animation, paintStroke] = await Promise.all([
      text("server/tools/paint.ts"),
      text("server/tools/animation.ts"),
      text("lib/paintStroke.ts"),
    ]);

    expect(paint).toContain("BarItems.brush_tool.select()");
    expect(paint).toContain("ColorPanel.set(");
    expect(paint).toContain("getRuntimePainter().startPaintTool");
    expect(paintStroke).toContain("painter.stopPaintTool()");

    expect(animation).toContain("Timeline.start()");
    expect(animation).toContain("Timeline.pause()");
    expect(animation).toContain("Timeline.setTime(");
  });

  test("texturing specialist routes deterministic pixels away from unnecessary Painter/UI state", async () => {
    const skill = await text("../.agents/skills/lazydesigner-texturing/SKILL.md");

    expect(skill).toContain("exact/deterministic pixel mutation → paint_texture_transaction");
    expect(skill).toContain("known exact RGBA/pixel coordinates");
    expect(skill).toContain("→ paint_texture_transaction");
    expect(skill).toContain("artistic brush stroke / soft brush / connected stroke");
    expect(skill).toContain("→ paint_with_brush");
    expect(skill).toContain("sample an already-authored pixel whose value is unknown");
    expect(skill).toContain("→ color_picker_tool");
    expect(skill).toMatch(/do not call `color_picker_tool` just to put a known value/i);
    expect(skill).toMatch(/one coherent `paint_texture_transaction` over many one-pixel Painter calls/i);
    expect(skill).toMatch(/trigger_action.*emulate_clicks.*fill_dialog.*normal texturing/is);
    expect(skill).toMatch(/do not call `activate_texture` immediately before a tool that already accepts explicit `texture_id`/i);
  });

  test("modelling specialist prefers direct coherent batches over selection or UI loops", async () => {
    const skill = await text("../.agents/skills/lazydesigner-modelling/SKILL.md");

    expect(skill).toContain('manage_cubes(operation="create")');
    expect(skill).toContain('manage_cubes(operation="batch_update")');
    expect(skill).toContain("add_group(groups=[...])");
    expect(skill).toMatch(/prefer explicit UUID\/name targeting over editor selection/i);
    expect(skill).toMatch(/do not create one Cube per MCP call/i);
    expect(skill).toMatch(/trigger_action.*emulate_clicks.*fill_dialog.*normal Cube\/Group creation/is);
  });

  test("animation specialist prefers native timeline and bounded cohorts over UI/key loops", async () => {
    const skill = await text("../.agents/skills/lazydesigner-animation/SKILL.md");

    expect(skill).toContain('manage_animation_timeline(operation="batch")');
    expect(skill).toContain('manage_animation_timeline(operation="timeline")');
    expect(skill).toContain('manage_animation_timeline(operation="properties")');
    expect(skill).toMatch(/trigger_action.*emulate_clicks.*fill_dialog.*normal animation/is);
    expect(skill).toMatch(/prefer one bounded keyframe\/batch mutation over loops of one-key calls/i);
    expect(skill).toMatch(/do not call `inspect_animation` after every successful deterministic mutation/i);
    expect(skill).toMatch(/prefer one bounded `capture_model_views\(animation_preview\)` request/i);
  });

  test("normal registration excludes generic UI/import fallback families", async () => {
    const profile = await text("lib/registrationProfile.ts");

    const normalFamilyBlock = profile.match(
      /BEDROCK_ENTITY_REGISTRATION_FAMILIES = \[([\s\S]*?)\] as const/
    )?.[1] ?? "";
    const legacyFamilyBlock = profile.match(
      /EXTENDED_LEGACY_REGISTRATION_FAMILIES = \[([\s\S]*?)\] as const/
    )?.[1] ?? "";

    expect(normalFamilyBlock).not.toContain('"ui"');
    expect(normalFamilyBlock).not.toContain('"import"');
    expect(legacyFamilyBlock).toContain('"ui"');
    expect(legacyFamilyBlock).toContain('"import"');
  });

  test("execution-path documentation keeps exact data distinct from UI fallback", async () => {
    const contract = await text("../docs/04-system/tool-execution-paths.md");

    for (const executionClass of [
      "DIRECT_API",
      "NATIVE_SUBSYSTEM",
      "EXACT_DATA",
      "UI_FALLBACK",
    ]) {
      expect(contract).toContain(executionClass);
    }

    expect(contract).toMatch(/UI_FALLBACK.*maintenance\/debug compatibility/is);
    expect(contract).toContain("paint_with_brush");
    expect(contract).toContain("exact-pixel");
  });
});
