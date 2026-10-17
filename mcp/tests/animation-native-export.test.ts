import { expect, test } from "bun:test";
import { getAllToolDefinitions } from "../lib/factories";
import "../server/tools";
import { exportModelParameters } from "../server/tools/export";

test("Bedrock animation export delegates every clip to native AnimationCodec without changing lifecycle", async () => {
  const clips = [{ name: "animation.citadel.test.idle" }, { name: "animation.citadel.test.death" }];
  const project = { name: "test", uuid: "test", save_path: "test.bbmodel", saved: true };
  const payload = { format_version: "1.8.0", animations: {
    [clips[0].name]: { loop: true }, [clips[1].name]: { loop: "hold_on_last_frame", animation_length: 6 },
  } };
  let calls = 0;
  const native = { compileFile(items: unknown[]) {
    calls++; expect(this).toBe(native); expect(items).toEqual(clips);
    expect(items).not.toBe(clips); return payload;
  } };
  const globals = { Project: project, Format: { id: "bedrock" }, Codecs: {},
    Animation: { all: clips }, AnimationCodec: { codecs: { bedrock: native } } };
  const saved = Object.keys(globals).map(k => [k, Object.getOwnPropertyDescriptor(globalThis,k)] as const);
  const run = (args: Record<string, unknown> = {}) => getAllToolDefinitions().export_model.execute(
    exportModelParameters.parse({ codec_id: "bedrock_animation", max_content_length: 10000, ...args }));
  try {
    for (const [k,v] of Object.entries(globals)) Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});
    const result = await run() as { structuredContent: { content: string; wrote_to_path: null } };
    expect(JSON.parse(result.structuredContent.content)).toEqual(payload);
    expect(result.structuredContent.wrote_to_path).toBeNull();
    expect(project).toEqual({ name: "test", uuid: "test", save_path: "test.bbmodel", saved: true });
    const formats = JSON.parse(await getAllToolDefinitions().list_export_formats.execute({}) as string);
    expect(formats.codecs.find((c: { id: string }) => c.id === "bedrock_animation")).toMatchObject({ available: true, content_only: true });
    await expect(run({ path: "/tmp/test.animation.json" })).rejects.toThrow("content-only");
    await expect(run({ options: { selected_only: true } })).rejects.toThrow("content-only");
    expect(calls).toBe(1);
    const animationGlobal = globals.Animation as { all?: unknown[] };
    animationGlobal.all = undefined;
    await expect(run()).rejects.toThrow("Animation.all");
    animationGlobal.all = clips;
    expect(calls).toBe(1);
    native.compileFile = () => { throw new Error("native compile failure"); };
    await expect(run()).rejects.toThrow("native compile failure");
    expect(project.saved).toBe(true);
    Reflect.deleteProperty(globalThis,"AnimationCodec");
    await expect(run()).rejects.toThrow("not registered");
  } finally {
    for (const [k,v] of saved) { if (v) Object.defineProperty(globalThis,k,v); else Reflect.deleteProperty(globalThis,k); }
  }
});
