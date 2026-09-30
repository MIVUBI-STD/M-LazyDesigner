/// <reference types="blockbench-types" />

import { getAllToolDefinitions } from "@/lib/factories";
import {
  analyzeTextureProductionAlignment,
  type TextureProductionAlignmentInput,
  type TextureProductionAlignmentRole,
} from "@/lib/texture/productionAlignment";

type RuntimeToolDefinition = {
  execute: (
    args: Record<string, unknown>,
    context?: unknown
  ) => Promise<unknown>;
};

let wired = false;

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function runtimeDefinition(name: string): RuntimeToolDefinition {
  const definition = getAllToolDefinitions()[name] as RuntimeToolDefinition | undefined;
  if (!definition) throw new Error(`Texture quality wiring requires ${name}.`);
  return definition;
}

function productionAlignmentRuntime() {
  const groups = TextureGroup.all ?? [];
  const inputs: TextureProductionAlignmentInput[] = (
    Project?.textures ?? Texture.all
  ).map((texture: Texture) => {
    const group = texture.group
      ? groups.find((candidate: TextureGroup) => candidate.uuid === texture.group)
      : undefined;
    const channel = texture.pbr_channel || "color";
    const role: TextureProductionAlignmentRole =
      channel !== "color"
        ? "pbr_support"
        : texture.group && group?.is_material === false
          ? "explicit_variant"
          : "base_color_candidate";

    return {
      uuid: texture.uuid,
      name: texture.name,
      role,
      pbr_channel: channel,
      group_uuid: texture.group || null,
      group_name: group?.name ?? null,
      group_is_material: group?.is_material ?? null,
      bitmap_width: texture.width,
      bitmap_height: texture.height,
      logical_uv_width: texture.getUVWidth(),
      logical_uv_height: texture.getUVHeight(),
    };
  });

  return analyzeTextureProductionAlignment(inputs);
}

/**
 * Adds metadata-only texture production diagnostics.
 * Material mutation semantics are owned by the base material executor.
 */
export function wireTextureQualityRuntime(): void {
  if (wired) return;

  const listTextures = runtimeDefinition("list_textures");
  const originalList = listTextures.execute.bind(listTextures);

  listTextures.execute = async (args, context) => {
    const result = await originalList(args, context);
    if (args.diagnostics !== true) return result;

    const scope =
      typeof args.diagnostic_scope === "string"
        ? args.diagnostic_scope
        : "full";
    if (scope !== "pbr" && scope !== "full") return result;

    const record = objectRecord(result);
    const structured = record ? objectRecord(record.structuredContent) : null;
    if (!record || !structured) return result;

    return {
      ...record,
      structuredContent: {
        ...structured,
        production_alignment: productionAlignmentRuntime(),
      },
    };
  };

  wired = true;
}