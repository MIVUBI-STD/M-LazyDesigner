/// <reference types="blockbench-types" />

import { createUvLayoutService } from "@/lib/uv/service";
import {
  createBlockbenchUvApplyAdapter,
  readBlockbenchUvNativeSource,
} from "@/server/runtime/uvLayoutRuntime";
import { textureProductionRole } from "@/server/tools/texture-atlas";

export function createBlockbenchUvLayoutService() {
  return createUvLayoutService({
    readSource: readBlockbenchUvNativeSource,
    readBitmapDimensions: () => {
      const textures = Project?.textures ?? Texture.all;
      const base = textures.filter(
        (texture) =>
          textureProductionRole(texture) ===
          "base_color_candidate"
      );
      if (base.length === 0) return null;
      if (base.length !== 1) {
        throw new Error(
          "UV_AUTO_BITMAP_AMBIGUOUS: expected one base-color atlas before automatic texel-density planning."
        );
      }
      return {
        width: base[0].width,
        height: base[0].display_height,
      };
    },
    createApplyAdapter: createBlockbenchUvApplyAdapter,
  });
}
