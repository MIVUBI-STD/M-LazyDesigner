/// <reference types="blockbench-types" />

import type { ToolSpec } from "@/lib/factories";
import {
  activateTextureToolDoc,
  addTextureGroupToolDoc,
  applyTextureToolDoc,
  registerTextureActivationTool,
  registerTextureAssignmentTools,
} from "./texture-assignment";
export {
  activateTextureParameters,
  addTextureGroupParameters,
  applyTextureParameters,
} from "./texture-assignment";

import {
  createTextureToolDoc,
  registerCreateTextureTool,
} from "./texture-create";
export {
  createTextureParameters,
  isDeterministicTextureSource,
  runNativeTemplateEdit,
} from "./texture-create";

import {
  getTextureToolDoc,
  listTexturesToolDoc,
  registerTextureReadTools,
} from "./texture-read";
export {
  getTextureParameters,
  listTexturesParameters,
} from "./texture-read";

import {
  registerTextureMaterialTools,
  textureMaterialToolDocs,
} from "./texture-materials";
export {
  assignTextureChannelParameters,
  configureMaterialParameters,
  createPbrMaterialParameters,
  getMaterialInfoParameters,
  hasExactTextureGroupNameCollision,
  importedTextureGroupName,
  importTextureSetParameters,
  isMinecraftTextureSetDocument,
  listMaterialsParameters,
  requireDistinctPbrChannelAssignments,
  requireMaterialConfigSavePostcondition,
  resolveTextureToolMaterial,
  saveMaterialConfigParameters,
} from "./texture-materials";

export {
  UV_ATLAS_AUDIT_EXAMPLE_LIMIT,
  buildUvAtlasAudit,
  classifyTextureProductionRole,
  collectUvAtlasUsages,
  currentTextureInventory,
  isAiProductionColorCanvas,
  isProvisionalTextureCanvas,
  requireTextureCreationPreflight,
  textureInventoryEntry,
  textureProductionRole,
  type TextureProductionRole,
  type TextureRoleMetadata,
  type UvAtlasUsage,
} from "./texture-atlas";

export const textureToolDocs: ToolSpec[] = [
  createTextureToolDoc,
  applyTextureToolDoc,
  addTextureGroupToolDoc,
  listTexturesToolDoc,
  getTextureToolDoc,
  ...textureMaterialToolDocs,
  activateTextureToolDoc,
];

export function registerTextureTools(): void {
  registerCreateTextureTool();
  registerTextureAssignmentTools();
  registerTextureReadTools();
  registerTextureMaterialTools();
  registerTextureActivationTool();
}
