/// <reference types="three" />
/// <reference types="blockbench-types" />

import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_EXPERIMENTAL, STATUS_STABLE } from "@/lib/constants";
import {
  assignTextureChannelParameters,
  configureMaterialParameters,
  createPbrMaterialParameters,
  getMaterialInfoParameters,
  importTextureSetParameters,
  listMaterialsParameters,
  saveMaterialConfigParameters,
} from "@/server/tools/texture/materialSchema";
export {
  assignTextureChannelParameters,
  configureMaterialParameters,
  createPbrMaterialParameters,
  getMaterialInfoParameters,
  importTextureSetParameters,
  listMaterialsParameters,
  saveMaterialConfigParameters,
} from "@/server/tools/texture/materialSchema";
import { resolveCoreTexture } from "@/lib/coreIdentity";
import {
  materialContinuationState,
  planMaterialChannelAssignment,
  resolveTextureToolMaterial,
} from "@/server/tools/texture/materialState";
export { resolveTextureToolMaterial } from "@/server/tools/texture/materialState";
import {
  materialMutationReceipt,
  materialPersistenceReceipt,
} from "@/lib/receipts/materialMutation";
import {
  recordCurrentCapabilitySemanticHistoryEffect,
  recordCurrentCapabilitySemanticHistoryEffectIfAdvanced,
} from "@/lib/semanticHistory";
import {
  hasExactTextureGroupNameCollision,
  importedTextureGroupName,
  isMinecraftTextureSetDocument,
  requireDistinctPbrChannelAssignments,
  requireMaterialConfigSavePostcondition,
} from "@/server/tools/texture-material-validation";
export {
  hasExactTextureGroupNameCollision,
  importedTextureGroupName,
  isMinecraftTextureSetDocument,
  requireDistinctPbrChannelAssignments,
  requireMaterialConfigSavePostcondition,
} from "@/server/tools/texture-material-validation";

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
          recordCurrentCapabilitySemanticHistoryEffect("create_pbr_material");
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
  
        const materialState = materialContinuationState(textureGroup);
        return {
          content: [
            {
              type: "text" as const,
              text: `Created PBR material "${textureGroup.name}" (${textureGroup.uuid}).`,
            },
          ],
          structuredContent: materialMutationReceipt({
            operation: "create",
            material: materialState,
          }),
        };
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
          recordCurrentCapabilitySemanticHistoryEffect("configure_material");
        } catch (error) {
          Undo.cancelEdit(true);
          Canvas.updateAll();
          throw error;
        }
  
        Canvas.updateAll();
  
        return {
          content: [
            {
              type: "text" as const,
              text: `Configured material "${textureGroup.name}".`,
            },
          ],
          structuredContent: materialMutationReceipt({
            operation: "configure",
            material: materialContinuationState(textureGroup),
          }),
        };
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
  
        const result = materials.map((group: TextureGroup) =>
          materialContinuationState(group)
        );
  
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
        const historyIndexBefore = Undo.index ?? 0;
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
        const materialState = materialContinuationState(createdGroup);
        recordCurrentCapabilitySemanticHistoryEffectIfAdvanced(
          "import_texture_set",
          historyIndexBefore
        );

        return {
          content: [{
            type: "text" as const,
            text: `Imported texture set from "${path}" as material "${createdGroup.name}" (uuid: ${createdGroup.uuid}).`,
          }],
          structuredContent: materialMutationReceipt({
            operation: "import_texture_set",
            source_path: path,
            material: materialState,
          }),
        };
      },
    }, textureMaterialToolDocs[4].status);
  
    createTool(textureMaterialToolDocs[5].name, {
      ...textureMaterialToolDocs[5],
      parameters: assignTextureChannelParameters,
      async execute({ material, texture, channel }) {
        const textureGroup = resolveTextureToolMaterial(material);
        const tex = resolveAssignTextureChannelTexture(texture);
        const existingTextures = textureGroup.getTextures();
        const { resetTextures, undoTextures } = planMaterialChannelAssignment(
          textureGroup,
          existingTextures,
          tex,
          channel
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
          recordCurrentCapabilitySemanticHistoryEffect("assign_texture_channel");
        } catch (error) {
          Undo.cancelEdit(true);
          Canvas.updateAll();
          throw error;
        }
  
        Canvas.updateAll();
  
        return {
          content: [
            {
              type: "text" as const,
              text: `Assigned texture "${tex.name}" to ${channel} channel of material "${textureGroup.name}".`,
            },
          ],
          structuredContent: materialMutationReceipt({
            operation: "assign_channel",
            material: materialContinuationState(textureGroup),
          }),
        };
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
  
        const result = materialPersistenceReceipt({
          operation: "save",
          scope: "material_persistence_only",
          material: {
            uuid: textureGroup.uuid,
            name: textureGroup.name,
          },
          file_path: filePath,
          saved: true,
          file_exists: true,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Saved material config to "${filePath}"`,
            },
          ],
          structuredContent: result,
        };
      },
    }, textureMaterialToolDocs[6].status);
  
    
}
