/// <reference types="three" />
/// <reference types="blockbench-types" />

import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_EXPERIMENTAL, STATUS_STABLE } from "@/lib/constants";
import { resolveCoreTexture } from "@/lib/coreIdentity";
import { getChannelTextureInfo } from "@/lib/util";
import {
  pbrChannelEnum,
  renderModeEnum,
  renderSidesEnum,
  textureIdSchema,
  textureIdOptionalSchema,
} from "@/lib/zodObjects";

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

// ============================================================================
// Texture Tool Docs
// ============================================================================


function resolveCreatePbrMaterialTexture(reference: string): Texture {
  return resolveCoreTexture(reference, "Use list_textures to confirm the intended UUID or texture ID before creating the PBR material.");
}

function resolveConfigureMaterialTexture(reference: string): Texture {
  return resolveCoreTexture(reference, "Use list_textures to confirm the intended UUID or texture ID before configuring the material.");
}

function resolveAssignTextureChannelTexture(reference: string): Texture {
  return resolveCoreTexture(reference, "Use list_textures to confirm the intended UUID or texture ID before assigning the PBR channel.");
}

function resolveTextureToolMaterial(reference: string): TextureGroup {
  const uuidMatch = TextureGroup.all.find(
    (group: TextureGroup) => group.uuid === reference
  );
  if (uuidMatch) return uuidMatch;

  const nameMatches = TextureGroup.all.filter(
    (group: TextureGroup) => group.name === reference
  );
  if (nameMatches.length === 1) return nameMatches[0];
  if (nameMatches.length > 1) {
    throw new Error(
      `Material/texture group name "${reference}" is ambiguous. Use an exact UUID. Candidates: ${nameMatches
        .map((group: TextureGroup) => `${group.name} (uuid: ${group.uuid})`)
        .join(", ")}`
    );
  }

  throw new Error(
    `Material/texture group "${reference}" not found. Use the list_materials tool to confirm the intended UUID or unique name.`
  );
}

type PbrChannelAssignment = {
  channel: z.infer<typeof pbrChannelEnum>;
  texture?: Pick<Texture, "uuid" | "name">;
};

export function hasExactTextureGroupNameCollision(
  groups: readonly { name: string }[],
  requestedName: string
): boolean {
  return groups.some((group) => group.name === requestedName);
}

export function isMinecraftTextureSetDocument(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const root = (value as Record<string, unknown>)["minecraft:texture_set"];
  return Boolean(root && typeof root === "object" && !Array.isArray(root));
}

export function importedTextureGroupName(filePath: string): string {
  const fileName = filePath.split(/[\/\\]/).pop() ?? filePath;
  return fileName.replace(/\.texture_set\.json$/, ".png material");
}

export function requireMaterialConfigSavePostcondition(
  saved: boolean,
  fileExists: boolean,
  filePath: string
): void {
  if (saved && fileExists) return;
  throw new Error(
    `Material config save was not confirmed at "${filePath}". Ensure the color texture has a writable existing directory, then retry.`
  );
}

export function requireDistinctPbrChannelAssignments(
  assignments: readonly PbrChannelAssignment[]
): void {
  const channelByTexture = new Map<string, string>();

  for (const { channel, texture } of assignments) {
    if (!texture) continue;

    const previousChannel = channelByTexture.get(texture.uuid);
    if (previousChannel && previousChannel !== channel) {
      throw new Error(
        `Texture "${texture.name}" (${texture.uuid}) cannot be assigned to both ${previousChannel} and ${channel} in one material operation. A Texture has one pbr_channel; use distinct textures per channel.`
      );
    }
    channelByTexture.set(texture.uuid, channel);
  }
}


export const textureMaterialToolDocs: ToolSpec[] = [
  {
    name: "create_pbr_material",
    description:
      "Creates a uniquely named PBR material TextureGroup.",
    annotations: {
      title: "Create PBR Material",
      destructiveHint: true,
    },
    parameters: createPbrMaterialParameters,
    status: STATUS_EXPERIMENTAL,
  },
  {
    name: "configure_material",
    description:
      "Applies authored changes to one PBR material.",
    annotations: {
      title: "Configure Material",
      destructiveHint: true,
    },
    parameters: configureMaterialParameters,
    status: STATUS_EXPERIMENTAL,
  },
  {
    name: "list_materials",
    description:
      "Lists all PBR materials (texture groups with is_material=true) and their assigned textures per channel.",
    annotations: {
      title: "List Materials",
      readOnlyHint: true,
    },
    parameters: listMaterialsParameters,
    status: STATUS_STABLE,
  },
  {
    name: "get_material_info",
    description:
      "Returns detailed metadata for one PBR material, including its Bedrock texture-set preview.",
    annotations: {
      title: "Get Material Info",
      readOnlyHint: true,
    },
    parameters: getMaterialInfoParameters,
    status: STATUS_STABLE,
  },
  {
    name: "import_texture_set",
    description:
      "Imports one Bedrock texture_set.json and returns the created material identity.",
    annotations: {
      title: "Import Texture Set",
      destructiveHint: true,
      openWorldHint: true,
    },
    parameters: importTextureSetParameters,
    status: STATUS_EXPERIMENTAL,
  },
  {
    name: "assign_texture_channel",
    description:
      "Assigns one texture to one PBR channel.",
    annotations: {
      title: "Assign Texture Channel",
      destructiveHint: true,
    },
    parameters: assignTextureChannelParameters,
    status: STATUS_EXPERIMENTAL,
  },
  {
    name: "save_material_config",
    description:
      "Saves one material as a Bedrock texture_set.json file.",
    annotations: {
      title: "Save Material Config",
      destructiveHint: true,
      openWorldHint: true,
    },
    parameters: saveMaterialConfigParameters,
    status: STATUS_EXPERIMENTAL,
  },
];

export function registerTextureMaterialTools(): void {
  createTool(textureMaterialToolDocs[0].name, {
      ...textureMaterialToolDocs[0],
      parameters: createPbrMaterialParameters,
      async execute({
        name,
        color_texture,
        normal_texture,
        height_texture,
        mer_texture,
        color_value,
        mer_value,
        subsurface_value,
      }) {
        if (hasExactTextureGroupNameCollision(TextureGroup.all, name)) {
          throw new Error(`TextureGroup/material name "${name}" already exists. Use a distinct name so future material references remain deterministic.`);
        }
        const colorTexture =
          color_texture !== undefined
            ? resolveCreatePbrMaterialTexture(color_texture)
            : undefined;
        const normalTexture =
          normal_texture !== undefined
            ? resolveCreatePbrMaterialTexture(normal_texture)
            : undefined;
        const heightTexture =
          height_texture !== undefined
            ? resolveCreatePbrMaterialTexture(height_texture)
            : undefined;
        const merTexture =
          mer_texture !== undefined
            ? resolveCreatePbrMaterialTexture(mer_texture)
            : undefined;
        requireDistinctPbrChannelAssignments([
          { channel: "color", texture: colorTexture },
          { channel: "normal", texture: normalTexture },
          { channel: "height", texture: heightTexture },
          { channel: "mer", texture: merTexture },
        ]);
        const texturesToAdd = [
          colorTexture,
          normalTexture,
          heightTexture,
          merTexture,
        ].filter((texture): texture is Texture => texture !== undefined);
        const originalTextureChannels = texturesToAdd.map((texture) => ({
          texture,
          group: texture.group,
          pbrChannel: texture.pbr_channel,
        }));
  
        // @ts-ignore - TextureGroup is globally available
        const textureGroup = new TextureGroup({
          name,
          is_material: true,
        });
  
        Undo.initEdit({
          texture_groups: [],
          textures: texturesToAdd,
        });
  
        try {
          // Set material config values
          if (color_value) {
            textureGroup.material_config.color_value = [
              color_value[0],
              color_value[1],
              color_value[2],
              color_value[3],
            ];
          }
          if (mer_value) {
            textureGroup.material_config.mer_value = [
              mer_value[0],
              mer_value[1],
              mer_value[2],
            ];
          }
          if (subsurface_value !== undefined) {
            textureGroup.material_config.subsurface_value = subsurface_value;
          }
          textureGroup.material_config.saved = false;
  
          // Match Blockbench's native create-material path: author the two
          // channel fields directly before adding the material group.
          if (colorTexture) {
            colorTexture.group = textureGroup.uuid;
            colorTexture.pbr_channel = "color";
          }
          if (normalTexture) {
            normalTexture.group = textureGroup.uuid;
            normalTexture.pbr_channel = "normal";
          }
          if (heightTexture) {
            heightTexture.group = textureGroup.uuid;
            heightTexture.pbr_channel = "height";
          }
          if (merTexture) {
            merTexture.group = textureGroup.uuid;
            merTexture.pbr_channel = "mer";
          }
  
          textureGroup.add();
  
          Undo.finishEdit("Agent created PBR material", {
            texture_groups: [textureGroup],
            textures: texturesToAdd,
          });
        } catch (error) {
          for (const { texture, group, pbrChannel } of originalTextureChannels) {
            texture.group = group;
            texture.pbr_channel = pbrChannel;
          }
          textureGroup.remove();
          Undo.cancelEdit();
          Canvas.updateAll();
          throw error;
        }
  
        Canvas.updateAll();
  
        return JSON.stringify({
          success: true,
          material: {
            name: textureGroup.name,
            uuid: textureGroup.uuid,
            is_material: true,
            channels: {
              color: color_texture ? true : !!color_value,
              normal: !!normal_texture,
              height: !!height_texture,
              mer: mer_texture ? true : !!mer_value,
            },
          },
        });
      },
    }, textureMaterialToolDocs[0].status);
  
    createTool(textureMaterialToolDocs[1].name, {
      ...textureMaterialToolDocs[1],
      parameters: configureMaterialParameters,
      async execute({
        material,
        color_texture,
        normal_texture,
        height_texture,
        mer_texture,
        color_value,
        mer_value,
        subsurface_value,
      }) {
        const textureGroup = resolveTextureToolMaterial(material);
        const textures = textureGroup.getTextures();
        const colorTexture =
          color_texture !== undefined && color_texture !== "none"
            ? resolveConfigureMaterialTexture(color_texture)
            : undefined;
        const normalTexture =
          normal_texture !== undefined && normal_texture !== "none"
            ? resolveConfigureMaterialTexture(normal_texture)
            : undefined;
        const heightTexture =
          height_texture !== undefined && height_texture !== "none"
            ? resolveConfigureMaterialTexture(height_texture)
            : undefined;
        const merTexture =
          mer_texture !== undefined && mer_texture !== "none"
            ? resolveConfigureMaterialTexture(mer_texture)
            : undefined;
        requireDistinctPbrChannelAssignments([
          { channel: "color", texture: colorTexture },
          { channel: "normal", texture: normalTexture },
          { channel: "height", texture: heightTexture },
          { channel: "mer", texture: merTexture },
        ]);
        const assignmentTextures = [
          colorTexture,
          normalTexture,
          heightTexture,
          merTexture,
        ].filter((texture): texture is Texture => texture !== undefined);
        const undoTextures = [...textures, ...assignmentTextures].filter(
          (texture, index, all) =>
            all.findIndex((candidate) => candidate.uuid === texture.uuid) === index
        );
  
        Undo.initEdit({
          texture_groups: [textureGroup],
          textures: undoTextures,
        });
  
        try {
          // Handle color channel
          if (color_texture === "none") {
            textures
              .filter((t: Texture) => t.pbr_channel === "color")
              .forEach((t: Texture) => (t.group = ""));
          } else if (colorTexture) {
            textures
              .filter((t: Texture) => t.pbr_channel === "color")
              .forEach((t: Texture) => (t.pbr_channel = "color"));
            colorTexture.group = textureGroup.uuid;
            colorTexture.pbr_channel = "color";
          }
  
          // Handle normal channel
          if (normal_texture === "none") {
            textures
              .filter((t: Texture) => t.pbr_channel === "normal")
              .forEach((t: Texture) => (t.group = ""));
          } else if (normalTexture) {
            normalTexture.group = textureGroup.uuid;
            normalTexture.pbr_channel = "normal";
          }
  
          // Handle height channel
          if (height_texture === "none") {
            textures
              .filter((t: Texture) => t.pbr_channel === "height")
              .forEach((t: Texture) => (t.group = ""));
          } else if (heightTexture) {
            heightTexture.group = textureGroup.uuid;
            heightTexture.pbr_channel = "height";
          }
  
          // Handle MER channel
          if (mer_texture === "none") {
            textures
              .filter((t: Texture) => t.pbr_channel === "mer")
              .forEach((t: Texture) => (t.group = ""));
          } else if (merTexture) {
            merTexture.group = textureGroup.uuid;
            merTexture.pbr_channel = "mer";
          }
  
          // Update uniform values
          if (color_value) {
            textureGroup.material_config.color_value = [
              color_value[0],
              color_value[1],
              color_value[2],
              color_value[3],
            ];
          }
          if (mer_value) {
            textureGroup.material_config.mer_value = [
              mer_value[0],
              mer_value[1],
              mer_value[2],
            ];
          }
          if (subsurface_value !== undefined) {
            textureGroup.material_config.subsurface_value = subsurface_value;
          }
  
          textureGroup.material_config.saved = false;
          textureGroup.updateMaterial();
  
          Undo.finishEdit("Agent configured material");
        } catch (error) {
          Undo.cancelEdit(true);
          Canvas.updateAll();
          throw error;
        }
  
        Canvas.updateAll();
  
        return `Configured material "${textureGroup.name}"`;
      },
    }, textureMaterialToolDocs[1].status);
  
    createTool(textureMaterialToolDocs[2].name, {
      ...textureMaterialToolDocs[2],
      parameters: listMaterialsParameters,
      async execute() {
        // @ts-ignore - TextureGroup is globally available
        const materials = TextureGroup.all.filter(
          (g: TextureGroup) => g.is_material
        );
  
        const result = materials.map((group: TextureGroup) => {
          const textures = group.getTextures();
          return {
            name: group.name,
            uuid: group.uuid,
            channels: {
              color: getChannelTextureInfo(textures, "color"),
              normal: getChannelTextureInfo(textures, "normal"),
              height: getChannelTextureInfo(textures, "height"),
              mer: getChannelTextureInfo(textures, "mer"),
            },
            config: {
              color_value: group.material_config.color_value,
              mer_value: group.material_config.mer_value,
              subsurface_value: group.material_config.subsurface_value,
              saved: group.material_config.saved,
            },
          };
        });
  
        return {
          content: [
            {
              type: "text" as const,
              text: `Found ${result.length} PBR material(s).`,
            },
          ],
          structuredContent: { materials: result },
        };
      },
    }, textureMaterialToolDocs[2].status);
  
    createTool(textureMaterialToolDocs[3].name, {
      ...textureMaterialToolDocs[3],
      parameters: getMaterialInfoParameters,
      async execute({ material }) {
        const textureGroup = resolveTextureToolMaterial(material);
        const textures = textureGroup.getTextures();
  
        // Get compiled texture_set.json
        let textureSetJson = null;
        try {
          textureSetJson = textureGroup.material_config.compileForBedrock();
        } catch {
          // Format might not support texture_set.json
        }
  
        const result = {
          name: textureGroup.name,
          uuid: textureGroup.uuid,
          is_material: textureGroup.is_material,
          textures: textures.map((tex: Texture) => ({
            name: tex.name,
            uuid: tex.uuid,
            pbr_channel: tex.pbr_channel,
            width: tex.width,
            height: tex.height,
            render_mode: tex.render_mode,
            render_sides: tex.render_sides,
          })),
          config: {
            color_value: textureGroup.material_config.color_value,
            mer_value: textureGroup.material_config.mer_value,
            subsurface_value: textureGroup.material_config.subsurface_value,
            saved: textureGroup.material_config.saved,
            file_path: textureGroup.material_config.getFilePath(),
          },
          texture_set_json: textureSetJson,
        };
  
        return {
          content: [
            {
              type: "text" as const,
              text: `Read PBR material "${textureGroup.name}" (${textureGroup.uuid}) with ${textures.length} texture(s); texture_set preview: ${textureSetJson ? "available" : "unavailable"}.`,
            },
          ],
          structuredContent: result,
        };
      },
    }, textureMaterialToolDocs[3].status);
  
    createTool(textureMaterialToolDocs[4].name, {
      ...textureMaterialToolDocs[4],
      parameters: importTextureSetParameters,
      async execute({ path }) {
        // Validate path ends with texture_set.json
        if (!path.endsWith(".texture_set.json")) {
          throw new Error(
            "Path must end with '.texture_set.json'. Example: '/absolute/path/mytexture.texture_set.json'"
          );
        }
  
        const fs = requireNativeModule("fs");
        if (!fs) {
          throw new Error("File system access was denied. Cannot import texture_set.json.");
        }
        if (!fs.existsSync(path)) {
          throw new Error(`File not found: ${path}`);
        }
  
        const fileName = path.split(/[\/\\]/).pop() ?? path;
        const expectedGroupName = importedTextureGroupName(path);
        if (hasExactTextureGroupNameCollision(TextureGroup.all, expectedGroupName)) {
          throw new Error(
            `Import would create TextureGroup name "${expectedGroupName}", which already exists. Rename/remove the existing group or import a distinctly named texture_set.json.`
          );
        }
  
        const parseJson = (globalThis as typeof globalThis & {
          autoParseJSON?: (data: string, feedback?: boolean | { file_path?: string }) => unknown;
        }).autoParseJSON;
        if (typeof parseJson !== "function") {
          throw new Error("Blockbench JSON parser is unavailable. Cannot preflight texture_set.json safely.");
        }
        const document = parseJson(
          fs.readFileSync(path, { encoding: "utf-8" }),
          false
        );
        if (!isMinecraftTextureSetDocument(document)) {
          throw new Error(
            `File "${path}" is not a valid Minecraft texture_set document: expected an object-valued "minecraft:texture_set" root.`
          );
        }
  
        const groupUuidsBefore = new Set(
          TextureGroup.all.map((group: TextureGroup) => group.uuid)
        );
        // Native import owns its Undo boundary and image/channel loading behavior.
        // @ts-ignore - importTextureSet is globally available
        importTextureSet({ path, name: fileName });
        const createdGroups = TextureGroup.all.filter(
          (group: TextureGroup) => !groupUuidsBefore.has(group.uuid)
        );
        if (createdGroups.length !== 1) {
          throw new Error(
            `Native texture_set import created ${createdGroups.length} new TextureGroups; expected exactly 1.`
          );
        }
        const [createdGroup] = createdGroups;
  
        return `Imported texture set from "${path}" as material "${createdGroup.name}" (uuid: ${createdGroup.uuid}).`;
      },
    }, textureMaterialToolDocs[4].status);
  
    createTool(textureMaterialToolDocs[5].name, {
      ...textureMaterialToolDocs[5],
      parameters: assignTextureChannelParameters,
      async execute({ material, texture, channel }) {
        const textureGroup = resolveTextureToolMaterial(material);
        const tex = resolveAssignTextureChannelTexture(texture);
        const existingTextures = textureGroup.getTextures();
        const resetTextures = existingTextures.filter(
          (existing: Texture) =>
            existing.pbr_channel === channel && existing.uuid !== tex.uuid
        );
        if (
          tex.group === textureGroup.uuid &&
          tex.pbr_channel === channel &&
          resetTextures.length === 0
        ) {
          throw new Error(
            `Texture "${tex.name}" is already the only ${channel} assignment on material "${textureGroup.name}"; no authored change is required.`
          );
        }
        const undoTextures = [tex, ...resetTextures].filter(
          (candidate, index, all) =>
            all.findIndex((item) => item.uuid === candidate.uuid) === index
        );
  
        Undo.initEdit({
          texture_groups: [textureGroup],
          textures: undoTextures,
        });
  
        try {
          // Remove any existing texture from this channel in the group
          resetTextures.forEach((existing: Texture) => {
            existing.pbr_channel = "color"; // Reset to color
          });
  
          // Assign the texture to the channel
          tex.group = textureGroup.uuid;
          tex.pbr_channel = channel;
  
          textureGroup.material_config.saved = false;
          textureGroup.updateMaterial();
  
          Undo.finishEdit("Agent assigned texture channel");
        } catch (error) {
          Undo.cancelEdit(true);
          Canvas.updateAll();
          throw error;
        }
  
        Canvas.updateAll();
  
        return `Assigned texture "${tex.name}" to ${channel} channel of material "${textureGroup.name}"`;
      },
    }, textureMaterialToolDocs[5].status);
  
    createTool(textureMaterialToolDocs[6].name, {
      ...textureMaterialToolDocs[6],
      parameters: saveMaterialConfigParameters,
      async execute({ material }) {
        const textureGroup = resolveTextureToolMaterial(material);
        const filePath = textureGroup.material_config.getFilePath();
  
        if (!filePath) {
          throw new Error(
            "Cannot save: Material needs a color texture with a valid file path. Save the color texture first, then try again."
          );
        }
  
        const fs = requireNativeModule("fs");
        if (!fs) {
          throw new Error("File system access was denied. Cannot save texture_set.json.");
        }
  
        textureGroup.material_config.save();
        requireMaterialConfigSavePostcondition(
          textureGroup.material_config.saved === true,
          fs.existsSync(filePath),
          filePath
        );
  
        return `Saved material config to "${filePath}"`;
      },
    }, textureMaterialToolDocs[6].status);
  
    
}
