import { z } from "zod";

export const elementIdSchema = z.string().min(1).describe("Element UUID or name.");
export const meshIdOptionalSchema = z.string().optional().describe("ID or name of the mesh. If not provided, uses selected mesh.");
export const meshIdSchema = z.string().describe("ID or name of the mesh.");
export const textureIdOptionalSchema = z.string().min(1).optional().describe("Texture UUID/ID/name; omit for selected/default.");
export const textureIdSchema = z.string().min(1).describe("Texture UUID/ID/name.");
export const animationIdOptionalSchema = z.string().min(1).optional().describe("Animation UUID/name; omit for current animation when supported.");
export const groupIdOptionalSchema = z.string().optional().describe("Group/bone ID or name.");
export const boneNameSchema = z.string().min(1).describe("Bone/Group UUID or name.");
export const cubeIdOptionalSchema = z.string().min(1).optional().describe("Cube UUID/name; omit for selected Cube(s) when supported.");
export const cubeIdSchema = z.string().min(1).describe("Cube UUID or name.");
export const faceKeysOptionalSchema = z.array(z.string()).optional().describe("Specific face keys. If not provided, uses all/selected faces.");
