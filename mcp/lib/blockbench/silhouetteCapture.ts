/// <reference types="blockbench-types" />

declare const THREE: typeof import("three");

/**
 * Captures solid Cube geometry from the existing offscreen Preview without
 * touching authored meshes, materials, group visibility, or the editor camera.
 * This deliberately ignores texture alpha, non-Cube elements and pose review.
 * Only an installed Blockbench test can establish renderer compatibility.
 */
export function captureNativeCubeSilhouette(preview: Preview): {
  png_data_url: string;
  rendered_cube_count: number;
} {
  if (!preview?.renderer || !preview.canvas || !preview.camera ||
      !Canvas?.scene || !Array.isArray(Cube?.all)) {
    throw new Error("CUBE_SILHOUETTE_RUNTIME_UNAVAILABLE");
  }

  const scene = new THREE.Scene();
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: true,
    transparent: false,
    toneMapped: false,
  });
  let count = 0;

  try {
    const meshIds = new Set<string>();
    for (const cube of Cube.all) {
      if (cube.visibility === false) continue;
      const source = cube.mesh as THREE.Mesh | undefined;
      if (!source || !source.isMesh || !source.geometry) {
        throw new Error("CUBE_SILHOUETTE_MESH_UNAVAILABLE");
      }
      if (meshIds.has(source.uuid)) continue;
      meshIds.add(source.uuid);
      let node: THREE.Object3D | null = source;
      let attached = false;
      let visible = true;
      while (node) {
        if (node.visible === false) visible = false;
        if (node === Canvas.scene) { attached = true; break; }
        node = node.parent;
      }
      if (!attached) throw new Error("CUBE_SILHOUETTE_SCENE_IDENTITY_UNAVAILABLE");
      if (!visible) continue;

      source.updateWorldMatrix(true, false);
      const proxy = source.clone(false) as THREE.Mesh;
      proxy.material = material;
      proxy.matrixAutoUpdate = false;
      proxy.matrix.copy(source.matrixWorld);
      proxy.matrixWorld.copy(source.matrixWorld);
      proxy.frustumCulled = false;
      proxy.visible = true;
      scene.add(proxy);
      count++;
    }
    if (!count) throw new Error("CUBE_SILHOUETTE_NO_VISIBLE_CUBES");

    const renderer = preview.renderer;
    const clearColor = renderer.getClearColor(new THREE.Color()).clone();
    const clearAlpha = renderer.getClearAlpha();
    const autoClear = renderer.autoClear;
    let primaryError: unknown = null;
    let png_data_url: string | undefined;

    try {
      renderer.autoClear = true;
      renderer.setClearColor(0x000000, 0);
      // Render the temporary isolated scene using the offscreen camera.
      // No global Canvas.scene overrides or native Cube material writes.
      renderer.render(scene, preview.camera);
      png_data_url = preview.canvas.toDataURL("image/png");
      if (!png_data_url.startsWith("data:image/png;base64,")) {
        throw new Error("CUBE_SILHOUETTE_PNG_UNAVAILABLE");
      }
    } catch (error) {
      primaryError = error;
    } finally {
      // Do not skip autoClear recovery or offscreen redraw if clear-color
      // restoration fails. Retain both the primary and cleanup failures.
      const restoreErrors: unknown[] = [];
      try {
        renderer.setClearColor(clearColor, clearAlpha);
      } catch (error) {
        restoreErrors.push(error);
      }
      renderer.autoClear = autoClear;
      try {
        preview.render();
      } catch (error) {
        restoreErrors.push(error);
      }
      if (restoreErrors.length > 0) {
        throw new AggregateError(
          primaryError === null ? restoreErrors : [primaryError, ...restoreErrors],
          "CUBE_SILHOUETTE_RENDER_OR_RESTORE_FAILED"
        );
      }
    }
    if (primaryError !== null) throw primaryError;
    return { png_data_url: png_data_url!, rendered_cube_count: count };
  } finally {
    scene.clear();
    material.dispose();
  }
}
