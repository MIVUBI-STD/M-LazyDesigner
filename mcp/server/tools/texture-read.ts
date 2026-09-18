/// <reference types="blockbench-types" />

import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_STABLE } from "@/lib/constants";
import { resolveCoreTexture } from "@/lib/coreIdentity";
import { imageContent } from "@/lib/util";
import { textureIdOptionalSchema } from "@/lib/zodObjects";
import {
  buildUvAtlasAudit,
  collectUvAtlasUsages,
  currentTextureInventory,
  textureInventoryEntry,
} from "./texture-atlas";

export const listTexturesParameters = z.object({
  diagnostics: z.boolean().optional().default(true).describe(
    "Keep true for UV/coverage/seam/PBR review; false returns texture inventory without UV or pixel diagnostics."
  ),
});

export const getTextureParameters = z.object({
  texture: textureIdOptionalSchema,
});


export const listTexturesToolDoc: ToolSpec = {
    name: "list_textures",
    description:
      "Lists texture identity. diagnostics=false returns inventory only; default true adds bounded UV/coverage/seam/PBR diagnostics. Seam checks are intra-Cube, empty scans are incomplete, and pixel-read budget counts unique texture regions. NON_INTEGRAL_PIXEL_MAPPING blocks invalid physical texels. Technical readiness is not visual approval.",
    annotations: {
      title: "List Textures",
      readOnlyHint: true,
    },
    parameters: listTexturesParameters,
    status: STATUS_STABLE,
  };

export const getTextureToolDoc: ToolSpec = {
    name: "get_texture",
    description:
      "Returns image data for the selected or explicitly identified texture.",
    annotations: {
      title: "Get Texture",
      readOnlyHint: true,
    },
    parameters: getTextureParameters,
    status: STATUS_STABLE,
  };

function resolveGetTextureTexture(reference: string): Texture {
  return resolveCoreTexture(reference, "Use list_textures to confirm the intended UUID or texture ID before reading image data.");
}



export function registerTextureReadTools(): void {
  createTool(listTexturesToolDoc.name, {
      ...listTexturesToolDoc,
      parameters: listTexturesParameters,
      async execute({ diagnostics }) {
        const inventory = currentTextureInventory();
        const uvAudit = diagnostics === false ? null : buildUvAtlasAudit(
          collectUvAtlasUsages(),
          Project?.texture_width ?? null,
          Project?.texture_height ?? null
        );
        const uvGate =
          uvAudit?.state === "available"
            ? uvAudit.production_gate.state
            : diagnostics === false ? "not_requested" : "unavailable";
        const result = {
          logical_uv: {
            width: Project?.texture_width ?? null,
            height: Project?.texture_height ?? null,
          },
          atlas_state: {
            state: inventory.state,
            base_color_candidates: inventory.base_color_candidates,
            explicit_variants: inventory.explicit_variants,
            pbr_support: inventory.pbr_support,
            default_texture_uuid: inventory.default_texture_uuid,
            selected_texture_uuid: inventory.selected_texture_uuid,
          },
          ...(uvAudit ? { uv_audit: uvAudit } : {}),
          textures: inventory.textures,
        };
  
        return {
          content: [
            {
              type: "text" as const,
              text: `Found ${inventory.textures.length} texture(s); base-color atlas state: ${inventory.state}; UV atlas gate: ${uvGate}.`,
            },
          ],
          structuredContent: result,
        };
      },
    }, listTexturesToolDoc.status);
  
    createTool(getTextureToolDoc.name, {
      ...getTextureToolDoc,
      parameters: getTextureParameters,
      async execute({ texture }) {
        const available = Project?.textures ?? Texture.all;
        if (!texture && available.length > 1) {
          throw new Error(
            "Multiple textures are loaded. Pass texture explicitly so atlas evidence cannot drift to implicit default state."
          );
        }
        const image = texture
          ? resolveGetTextureTexture(texture)
          : Texture.getDefault();
        if (!image) {
          throw new Error(
            "No default texture available. Use the create_texture tool to create one first, or specify a texture ID."
          );
        }
  
        const imageResult = imageContent({ url: image.getDataURL() });
        return {
          ...imageResult,
          structuredContent: {
            inspection: "full_atlas",
            texture: textureInventoryEntry(image),
          },
        };
      },
    }, getTextureToolDoc.status);
}
