import { z } from "zod";
import { isAbsoluteFilesystemPath } from "@/lib/core/path";
import { colorSchema } from "@/lib/schemas/common";
import {
  pbrChannelEnum,
  renderModeEnum,
  renderSidesEnum,
} from "@/lib/schemas/texture";
import { textureIdOptionalSchema } from "@/lib/schemas/ids";

export function isDeterministicTextureSource(value: string): boolean {
  if (value.startsWith("data:image/")) return true;
  return isAbsoluteFilesystemPath(value.replace(/^file:\/\//, ""));
}

export const createTextureParameters = z
  .object({
    name: z.string().min(1).describe("Non-empty texture name."),
    texture_id: textureIdOptionalSchema.describe(
      "Template rebuild only: UUID of the existing single base atlas to repack in place, preserving its identity and mapped pixels."
    ),
    type: z
      .enum(["blank", "template"])
      .default("blank")
      .describe(
        "Texture creation mode. Template builds UV layout from model geometry before any pixel painting."
      ),
    width: z.number().int().min(16).max(4096).default(16),
    height: z.number().int().min(16).max(4096).default(16),
    pixel_density: z
      .union([
        z.literal(16),
        z.literal(32),
        z.literal(64),
        z.literal(128),
        z.literal(256),
        z.literal(512),
      ])
      .default(16)
      .describe(
        "Template density in pixels per 16 model units. At 16x, one model unit maps to one texture pixel."
      ),
    rearrange_uv: z
      .boolean()
      .default(true)
      .describe("Generate and assign a fresh UV arrangement for template mode."),
    power_of_two: z
      .boolean()
      .default(true)
      .describe("Round the generated template atlas to a power-of-two square."),
    keep_multi_texture_occupancy: z
      .boolean()
      .default(true)
      .describe("Reuse identical existing UV occupancy when generating a template."),
    padding: z
      .boolean()
      .default(false)
      .describe("Reserve a one-pixel padding border around template islands."),
    data: z
      .string()
      .refine(isDeterministicTextureSource, {
        message:
          "Texture data must be an image data URL or an absolute POSIX, Windows-drive, UNC, or file:// path.",
      })
      .optional()
      .describe("Image data URL or deterministic absolute image file path."),
    group: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Optional TextureGroup UUID or unique exact name."
      ),
    fill_color: colorSchema
      .optional()
      .describe("RGBA color to fill the texture, as tuple or HEX string."),
    layer_name: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Non-empty texture layer name. Required if fill_color is set."
      ),
    pbr_channel: pbrChannelEnum
      .optional()
      .describe(
        "PBR channel: color, normal, height, or MER."
      ),
    render_mode: renderModeEnum
      .optional()
      .default("default")
      .describe(
        "Texture render mode."
      ),
    render_sides: renderSidesEnum
      .optional()
      .default("auto")
      .describe("Render sides for the texture. Auto, front, or double."),
  })
  .refine((params) => !(params.data && params.fill_color), {
    message:
      "The 'data' and 'fill_color' properties cannot both be defined.",
    path: ["data", "fill_color"],
  })
  .refine((params) => !(params.fill_color && !params.layer_name), {
    message:
      "The 'layer_name' property is required when 'fill_color' is set.",
    path: ["layer_name", "fill_color"],
  })
  .superRefine((params, ctx) => {
    if (params.texture_id !== undefined && params.type !== "template") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["texture_id"], message: "texture_id is only supported for template rebuild." });
    }
    if (params.type !== "template") return;
    if (params.data !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["data"],
        message: "Template mode owns bitmap generation; do not provide image data.",
      });
    }
    if (params.pbr_channel !== undefined && params.pbr_channel !== "color") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pbr_channel"],
        message: "Template mode creates the base-color atlas only.",
      });
    }
  })
  .refine(
    ({ pbr_channel, group }) => (pbr_channel && group) || !pbr_channel,
    {
      message:
        "The 'group' property is required when 'pbr_channel' is set.",
      path: ["group", "pbr_channel"],
    }
  );
