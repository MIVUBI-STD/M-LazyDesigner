import { afterEach, describe, expect, test } from "bun:test";
import { captureNativeCubeSilhouette } from "@/lib/blockbench/silhouetteCapture";

const globals = globalThis as any;
const oldGlobals = {
  THREE: globals.THREE,
  Cube: globals.Cube,
  Canvas: globals.Canvas,
};
afterEach(() => {
  globals.THREE = oldGlobals.THREE;
  globals.Cube = oldGlobals.Cube;
  globals.Canvas = oldGlobals.Canvas;
});

function setup(options: { hidden?: boolean; renderFails?: boolean; restoreFails?: boolean; redrawFails?: boolean } = {}) {
  const scenes: any[] = [];
  const disposed: any[] = [];
  class Scene {
    children: any[] = [];
    visible = true;
    add(item: any) { this.children.push(item); }
    clear() { this.children = []; }
  }
  class Color {
    clone() { return new Color(); }
  }
  class MeshBasicMaterial {
    params: unknown;
    constructor(params: unknown) { this.params = params; }
    dispose() { disposed.push(this); }
  }
  globals.THREE = { Scene, Color, MeshBasicMaterial, DoubleSide: 2 };
  const root = new Scene();
  globals.Canvas = { scene: root };
  const initialMaterial = { name: "untouched" };
  const source = {
    uuid: "cube-mesh-1", isMesh: true, visible: !options.hidden,
    geometry: { id: "geometry" }, parent: root, material: initialMaterial,
    matrixWorld: { value: "native-transform" },
    updateWorldMatrixCalls: 0,
    updateWorldMatrix() { this.updateWorldMatrixCalls++; },
    clone() {
      return {
        isMesh: true, geometry: this.geometry,
        material: this.material, visible: this.visible,
        matrixAutoUpdate: true, matrix: { copy(matrix: any) { this.matrixSource = matrix; } },
        matrixWorld: { copy(matrix: any) { this.matrixSource = matrix; } },
        frustumCulled: true,
      };
    },
  };
  globals.Cube = { all: [{ visibility: true, mesh: source }] };
  const camera = { kind: "offscreen-camera" };
  const renderer = {
    autoClear: false,
    currentColor: "original",
    currentAlpha: 0.7,
    getClearColor() { return new Color(); },
    getClearAlpha() { return this.currentAlpha; },
    setClearColor(value: any, alpha: number) {
      if (options.restoreFails && alpha === 0.7) throw new Error("restore-failure");
      this.currentColor = value;
      this.currentAlpha = alpha;
    },
    render(scene: any, chosenCamera: any) {
      scenes.push({ scene, camera: chosenCamera, autoClear: this.autoClear });
      if (options.renderFails) throw new Error("gpu-failure");
    },
  };
  let redraws = 0;
  const preview = {
    renderer, camera,
    canvas: { toDataURL() { return "data:image/png;base64," + Buffer.from("fixture").toString("base64"); } },
    render() { redraws++; if (options.redrawFails) throw new Error("redraw-failure"); },
  };
  return { source, initialMaterial, renderer, preview, scenes, disposed, redraws: () => redraws };
}

describe("isolated native Cube silhouette render contract", () => {
  test("renders cloned visible Cubes without changing original material or active preview", () => {
    const fixture = setup();
    const result = captureNativeCubeSilhouette(fixture.preview as any);
    expect(result.rendered_cube_count).toBe(1);
    expect(result.png_data_url.startsWith("data:image/png;base64,")).toBe(true);
    expect(fixture.scenes).toHaveLength(1);
    expect(fixture.scenes[0]!.camera).toBe(fixture.preview.camera);
    expect(fixture.scenes[0]!.autoClear).toBe(true);
    expect(fixture.scenes[0]!.scene).not.toBe(globals.Canvas.scene);
    expect(fixture.source.material).toBe(fixture.initialMaterial);
    expect(fixture.source.updateWorldMatrixCalls).toBe(1);
    expect(fixture.renderer.autoClear).toBe(false);
    expect(fixture.renderer.currentAlpha).toBe(0.7);
    expect(fixture.disposed).toHaveLength(1);
    expect(fixture.redraws()).toBe(1);
  });

  test("restores renderer on native WebGL failure", () => {
    const fixture = setup({ renderFails: true });
    expect(() => captureNativeCubeSilhouette(fixture.preview as any)).toThrow("gpu-failure");
    expect(fixture.renderer.autoClear).toBe(false);
    expect(fixture.renderer.currentAlpha).toBe(0.7);
    expect(fixture.source.material).toBe(fixture.initialMaterial);
    expect(fixture.disposed).toHaveLength(1);
    expect(fixture.redraws()).toBe(1);
  });

  test("clear-color restore failure still restores autoClear and attempts redraw", () => {
    const fixture = setup({ restoreFails: true });
    let failure: unknown;
    try { captureNativeCubeSilhouette(fixture.preview as any); }
    catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).errors).toHaveLength(1);
    expect(fixture.renderer.autoClear).toBe(false);
    expect(fixture.redraws()).toBe(1);
    expect(fixture.source.material).toBe(fixture.initialMaterial);
    expect(fixture.disposed).toHaveLength(1);
  });

  test("both renderer and restore failures remain available for diagnosis", () => {
    const fixture = setup({ renderFails: true, restoreFails: true });
    let failure: unknown;
    try { captureNativeCubeSilhouette(fixture.preview as any); }
    catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).errors.map((item: Error) => item.message))
      .toEqual(["gpu-failure", "restore-failure"]);
    expect(fixture.renderer.autoClear).toBe(false);
    expect(fixture.redraws()).toBe(1);
    expect(fixture.disposed).toHaveLength(1);
  });

  test("offscreen redraw failure retains cleanup evidence without touching authored material", () => {
    const fixture = setup({ redrawFails: true });
    expect(() => captureNativeCubeSilhouette(fixture.preview as any))
      .toThrow("CUBE_SILHOUETTE_RENDER_OR_RESTORE_FAILED");
    expect(fixture.renderer.autoClear).toBe(false);
    expect(fixture.source.material).toBe(fixture.initialMaterial);
    expect(fixture.redraws()).toBe(1);
    expect(fixture.disposed).toHaveLength(1);
  });

  test("invisible native Cube cannot generate a misleading silhouette", () => {
    const fixture = setup({ hidden: true });
    expect(() => captureNativeCubeSilhouette(fixture.preview as any))
      .toThrow("CUBE_SILHOUETTE_NO_VISIBLE_CUBES");
    expect(fixture.scenes).toHaveLength(0);
    expect(fixture.disposed).toHaveLength(1);
  });

  test("does not accept a Cube that is detached from the live Blockbench scene", () => {
    const fixture = setup();
    fixture.source.parent = null as any;
    expect(() => captureNativeCubeSilhouette(fixture.preview as any))
      .toThrow("CUBE_SILHOUETTE_SCENE_IDENTITY_UNAVAILABLE");
    expect(fixture.scenes).toHaveLength(0);
  });

  test("uses existing silhouette evidence target without a new public input or tool", async () => {
    const runtime = await Bun.file("server/tools/inspection/camera.ts").text();
    expect(runtime).toContain('evidence_targets?.includes("silhouette")');
    expect(runtime).toContain("captureNativeCubeSilhouette(capturePreview)");
    expect(runtime).toContain("extractVerifiedPngAlpha({");
    expect(runtime).toContain("silhouette_evidence: silhouetteEvidence");
    expect(runtime).toContain('visual_verdict: "NOT_EVALUATED"');
    expect(runtime).toContain("automatic_correction: false");
    expect(runtime).not.toContain('name: "capture_silhouette"');
  });
});
