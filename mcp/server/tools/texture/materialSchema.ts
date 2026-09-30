import { z } from "zod";
import { isAbsoluteFilesystemPath } from "@/lib/core/path";
import { pbrChannelEnum } from "@/lib/schemas/texture";
import { textureIdSchema } from "@/lib/schemas/ids";

export const createPbrMaterialParameters = z.object({
  name: z.string().min(1).describe("Non-empty material name."),
  color_texture: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Optional color Texture UUID, exact ID, or unique exact name."
    ),
  normal_texture: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Optional normal Texture UUID, exact ID, or unique exact name."
    ),
  height_texture: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Optional height Texture UUID, exact ID, or unique exact name."
    ),
  mer_texture: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Optional MER Texture UUID, exact ID, or unique exact name."
    ),
  color_value: z
    .array(z.number().min(0).max(255))
    .length(4)
    .optional()
    .describe(
      "Uniform RGBA color [R,G,B,A] when no color texture is provided."
    ),
  mer_value: z
    .array(z.number().min(0).max(255))
    .length(3)
    .optional()
    .describe(
      "Uniform MER values [Metalness, Emissive, Roughness] (0-255) when no MER texture is provided."
    ),
  subsurface_value: z
    .number()
    .min(0)
    .max(255)
    .optional()
    .describe(
      "Subsurface scattering value (0-255) for Bedrock 1.21.30+ materials."
    ),
}).superRefine((params, ctx) => {
  if (params.color_texture !== undefined && params.color_value !== undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["color_value"], message: "Choose either color_texture or color_value; native Bedrock export uses the texture when both exist." });
  }
  if (params.mer_texture !== undefined && params.mer_value !== undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mer_value"], message: "Choose either mer_texture or mer_value; native Bedrock export uses the MER texture when both exist." });
  }
  if (params.normal_texture !== undefined && params.height_texture !== undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["height_texture"], message: "Choose normal_texture or height_texture, not both; native Bedrock export prefers normal when both exist." });
  }
});

export const configureMaterialParameters = z.object({
  material: z
    .string()
    .min(1)
    .describe(
      "Required material/TextureGroup UUID or unique exact name."
    ),
  color_texture: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Color Texture UUID/ID/unique name, or `none` for uniform color."
    ),
  normal_texture: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Normal Texture UUID/ID/unique name, or `none` to remove."
    ),
  height_texture: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Height Texture UUID/ID/unique name, or `none` to remove."
    ),
  mer_texture: z
    .string()
    .min(1)
    .optional()
    .describe(
      "MER Texture UUID/ID/unique name, or `none` for uniform values."
    ),
  color_value: z
    .array(z.number().min(0).max(255))
    .length(4)
    .optional()
    .describe("Uniform RGBA color [R,G,B,A] when no color texture."),
  mer_value: z
    .array(z.number().min(0).max(255))
    .length(3)
    .optional()
    .describe(
      "Uniform MER values [Metalness, Emissive, Roughness] (0-255)."
    ),
  subsurface_value: z
    .number()
    .min(0)
    .max(255)
    .optional()
    .describe("Subsurface scattering value (0-255)."),
}).refine(
  (params) =>
    Object.entries(params).some(
      ([key, value]) => key !== "material" && value !== undefined
    ),
  {
    message:
      "configure_material requires at least one authored field change in addition to material.",
  }
).superRefine((params, ctx) => {
  if (params.color_texture !== undefined && params.color_texture !== "none" && params.color_value !== undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["color_value"], message: "Do not send color_value with an explicit color texture. Use color_texture=none when switching to uniform color." });
  }
  if (params.mer_texture !== undefined && params.mer_texture !== "none" && params.mer_value !== undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mer_value"], message: "Do not send mer_value with an explicit MER texture. Use mer_texture=none when switching to uniform MER values." });
  }
  const hasNormalTexture = params.normal_texture !== undefined && params.normal_texture !== "none";
  const hasHeightTexture = params.height_texture !== undefined && params.height_texture !== "none";
  if (hasNormalTexture && hasHeightTexture) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["height_texture"], message: "Configure normal_texture or height_texture as the active depth source, not both in one call." });
  }
});

export const listMaterialsParameters = z.object({});

export const getMaterialInfoParameters = z.object({
  material: z
    .string()
    .min(1)
    .describe(
      "Material/texture group target to inspect; UUID preferred, exact name only when unique."
    ),
});

export const importTextureSetParameters = z.object({
  path: z
    .string()
    .refine(isAbsoluteFilesystemPath, {
      message:
        "Texture-set import path must be absolute: use a POSIX `/...` path, a Windows drive path such as `C:\\\\...`, or a UNC path such as `\\\\\\\\server\\\\share\\\\...`.",
    })
    .describe("Absolute path to the .texture_set.json file to import."),
});

export const assignTextureChannelParameters = z.object({
  material: z
    .string()
    .min(1)
    .describe(
      "Material/texture group target for channel assignment; UUID preferred, exact name only when unique."
    ),
  texture: textureIdSchema
    .min(1)
    .describe(
      "Explicit texture target; UUID preferred, then texture ID, then unique name."
    ),
  channel: pbrChannelEnum.describe("PBR channel to assign the texture to."),
});

export const saveMaterialConfigParameters = z.object({
  material: z
    .string()
    .min(1)
    .describe(
      "Material/texture group target to save; UUID preferred, exact name only when unique."
    ),
});
