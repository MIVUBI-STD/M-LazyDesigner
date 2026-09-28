import { z } from "zod";

const vector2Schema = z.array(z.number().finite()).length(2);
const vector3Schema = z.array(z.number().finite()).length(3);

export const cubeGeometryEffectSchema = z.object({
  changed_fields: z.array(z.string()),
  center_delta: vector3Schema,
  size_delta: vector3Schema,
  origin_delta: vector3Schema,
  rotation_delta: vector3Schema,
  inflate_delta: z.number().finite(),
  uv_offset_delta: vector2Schema,
  mirror_uv_changed: z.boolean(),
  autouv_changed: z.boolean(),
  visibility_changed: z.boolean(),
  faces_changed: z.boolean(),
});

export const cubeVisualScopeSchema = z.object({
  cube_uuids: z.array(z.string().min(1)).min(1).max(32),
  framing: z.object({
    min: vector3Schema,
    max: vector3Schema,
  }),
});

export function cubeGeometryEffect<T extends Record<string, unknown>>(
  effect: T
): T {
  cubeGeometryEffectSchema.parse(effect);
  return effect;
}

export function cubeVisualScope<T extends Record<string, unknown>>(
  scope: T
): T {
  cubeVisualScopeSchema.parse(scope);
  return scope;
}

export function cubeChangedFieldsFromResult(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const root = value as Record<string, unknown>;
  const fields = new Set<string>();

  const add = (candidate: unknown) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return;
    }
    const effect = (candidate as Record<string, unknown>).geometry_effect;
    const parsed = cubeGeometryEffectSchema.safeParse(effect);
    if (!parsed.success) return;
    for (const field of parsed.data.changed_fields) fields.add(field);
  };

  add(root);
  if (Array.isArray(root.effects)) {
    for (const effect of root.effects) add(effect);
  }
  return [...fields];
}

export function cubeVisualScopeFromResult(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const root = value as Record<string, unknown>;
  return cubeVisualScopeSchema.safeParse(root.visual_scope).success
    ? cubeVisualScopeSchema.parse(root.visual_scope)
    : null;
}
