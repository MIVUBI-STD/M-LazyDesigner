import { z } from "zod";
import { vector3Schema } from "./common";

export const autoUvEnum = z.enum(["0", "1", "2"]);
export const faceEnum = z.enum(["north", "south", "east", "west", "up", "down"]);
export const meshSelectionModeEnum = z.enum(["vertex", "edge", "face"]);
export const uvMappingModeEnum = z.enum(["project", "unwrap", "cylinder", "sphere"]);
export const uvRotationAngleEnum = z.enum(["-90", "90", "180"]);
export const stretchSchema = z.array(z.number()).length(3).describe("Stretch values [x, y, z].");

export const cubeSchema = z.object({
  name: z.string().min(1).describe("Non-empty Cube name."),
  origin: vector3Schema.optional().default([0, 0, 0]).describe("Pivot point of the cube."),
  from: vector3Schema.optional().default([0, 0, 0]).describe("Starting point of the cube."),
  to: vector3Schema.optional().default([1, 1, 1]).describe("Ending point of the cube."),
  rotation: vector3Schema.optional().default([0, 0, 0]).describe("Rotation of the cube."),
});

export const meshSchema = z.object({
  name: z.string(),
  position: vector3Schema.optional().default([0, 0, 0]).describe("Position of the mesh."),
  rotation: vector3Schema.optional().default([0, 0, 0]).describe("Rotation of the mesh."),
  scale: vector3Schema.optional().default([1, 1, 1]).describe("Scale of the mesh."),
  vertices: z.array(vector3Schema.describe("Vertex coordinates in the mesh.")).optional().default([]).describe("Vertices of the mesh."),
});
