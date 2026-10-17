import { afterEach, expect, test } from "bun:test";
import { getAllToolDefinitions } from "@/lib/factories";
import "@/server/tools";

const original = new Map<string, PropertyDescriptor | undefined>();
function install(name: string, value: unknown) {
  original.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}
afterEach(() => {
  for (const [name, descriptor] of original) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
  original.clear();
});
function fixture() {
  const calls: unknown[] = [];
  const clips = ["target", "selected"].map(uuid => ({
    uuid, name: uuid, path: "external.animation.json",
    remove(undo: boolean, removeFromFile: boolean) {
      calls.push([uuid, undo, removeFromFile]);
      clips.splice(clips.indexOf(this), 1);
    },
  }));
  install("AnimationItem", { all: clips, selected: clips[1] });
  install("Timeline", { pause() { calls.push("pause"); } });
  install("Animator", { preview() { calls.push("preview"); } });
  return { calls, clips };
}
const run = (animation_id?: string) => getAllToolDefinitions().animation_timeline.execute({ action: "delete", animation_id });

test("clip deletion requires explicit identity before native lookup or mutation", async () => {
  const { calls } = fixture();
  await expect(run()).rejects.toThrow("explicit animation_id");
  expect(calls).toEqual([]);
});
test("clip deletion delegates Undo to native remove and preserves external files and another selection", async () => {
  const { calls, clips } = fixture();
  const result = await run("target") as { structuredContent: { deleted_animation_id: string } };
  expect(result.structuredContent.deleted_animation_id).toBe("target");
  expect(calls).toEqual(["pause", ["target", true, false], "preview"]);
  expect(clips.map(c => c.uuid)).toEqual(["selected"]);
  expect(clips[0].path).toBe("external.animation.json");
});
test("missing and ambiguous clip targets fail before playback or deletion", async () => {
  const { calls, clips } = fixture();
  await expect(run("missing")).rejects.toThrow();
  clips[0].name = clips[1].name = "duplicate";
  await expect(run("duplicate")).rejects.toThrow();
  expect(calls).toEqual([]);
  expect(clips.length).toBe(2);
});
