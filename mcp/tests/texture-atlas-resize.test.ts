import { afterEach, expect, test } from "bun:test";
import { resizeMappedAtlas } from "@/server/tools/texture/create";

const originals = new Map<string, PropertyDescriptor | undefined>();
function mock(name: string, value: unknown) {
  originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}
afterEach(() => {
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
  originals.clear();
});

function fixture() {
  const events: string[] = [];
  const textures = ["red", "blue"].map(uuid => ({
    uuid, name: uuid, width: 512, height: 512, uv_width: 128, uv_height: 128,
    canvas: {}, frameCount: 1, getUVWidth() { return this.uv_width; }, getUVHeight() { return this.uv_height; },
    source: uuid + "-source", group: uuid + "-group", layers_enabled: false,
    updateSource(source: string) { this.source = source; events.push(uuid); }, img: { async decode() {} },
  }));
  mock("Texture", { all: textures, getDefault() { return textures[0]; } });
  mock("TextureGroup", { all: [] });
  mock("Project", { texture_width: 128, texture_height: 128 });
  let snapshot: Array<{ width: number; height: number; uv_width: number; uv_height: number; source: string }> = [];
  mock("Undo", {
    initEdit() { snapshot = textures.map(t => ({ width: t.width, height: t.height, uv_width: t.uv_width, uv_height: t.uv_height, source: t.source })); events.push("begin"); },
    finishEdit() { events.push("finish"); },
    cancelEdit() { textures.forEach((t, i) => Object.assign(t, snapshot[i])); events.push("rollback"); },
  });
  mock("Canvas", { updateAll() {} });
  mock("document", { createElement() { return { getContext() { return { imageSmoothingEnabled: true, drawImage() { expect(this.imageSmoothingEnabled).toBe(false); } }; }, toDataURL() { return "data:image/png;base64,test"; } }; } });
  return { textures, events };
}
test("mapped atlas resize includes both variants without changing UUID or logical UV", async () => {
  const { textures, events } = fixture();
  await resizeMappedAtlas(textures[0] as unknown as Texture, 256, 256);
  expect(textures.map(t => [t.uuid, t.width, t.height, t.uv_width, t.uv_height])).toEqual([
    ["red", 256, 256, 128, 128], ["blue", 256, 256, 128, 128],
  ]);
  expect(events).toEqual(["begin", "red", "blue", "finish"]);
  expect(textures.map(t => t.group)).toEqual(["red-group", "blue-group"]);
});
test("incompatible dependent atlas is rejected before Undo", async () => {
  const { textures, events } = fixture();
  textures[1].width = 256;
  await expect(resizeMappedAtlas(textures[0] as unknown as Texture, 256, 256)).rejects.toThrow("matching");
  expect(events).toEqual([]);
});
test("decode failure cancels the native transaction", async () => {
  const { textures, events } = fixture();
  textures[1].img.decode = async () => { throw new Error("decode failure"); };
  await expect(resizeMappedAtlas(textures[0] as unknown as Texture, 256, 256)).rejects.toThrow("decode failure");
  expect(events.at(-1)).toBe("rollback");
  expect(events).not.toContain("finish");
  expect(textures.map(t => [t.width, t.height, t.source])).toEqual([
    [512, 512, "red-source"], [512, 512, "blue-source"],
  ]);
});
test("layered, animated and logical-UV-incompatible atlases fail before Undo", async () => {
  const { textures, events } = fixture();
  textures[1].layers_enabled = true;
  await expect(resizeMappedAtlas(textures[0] as unknown as Texture, 256, 256)).rejects.toThrow("flattened");
  textures[1].layers_enabled = false;
  textures[1].frameCount = 2;
  await expect(resizeMappedAtlas(textures[0] as unknown as Texture, 256, 256)).rejects.toThrow("non-animated");
  textures[1].frameCount = 1;
  textures[1].uv_width = 64;
  await expect(resizeMappedAtlas(textures[0] as unknown as Texture, 256, 256)).rejects.toThrow("matching");
  expect(events).toEqual([]);
});
test("same-size resize and an in-progress native edit are rejected without mutation", async () => {
  const { textures, events } = fixture();
  await expect(resizeMappedAtlas(textures[0] as unknown as Texture, 512, 512)).rejects.toThrow("already");
  Object.assign(Undo, { current_save: {} });
  await expect(resizeMappedAtlas(textures[0] as unknown as Texture, 256, 256)).rejects.toThrow("Finish");
  expect(events).toEqual([]);
});
