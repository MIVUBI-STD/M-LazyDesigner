/// <reference types="blockbench-types" />

import { getAllToolDefinitions } from "@/lib/factories";
import { resolveCoreTexture } from "@/lib/coreIdentity";
import { normalizeTextureEvidenceRegion } from "@/lib/textureEvidence";
import { analyzeRenderAwareAlpha } from "@/lib/textureAlphaSemantics";
import type { EntityRenderProfile } from "@/lib/textureRenderProfile";

type RuntimeToolDefinition = {
  execute: (
    args: Record<string, unknown>,
    context?: unknown
  ) => Promise<unknown>;
};

type AlphaIntent = {
  render_profile?: EntityRenderProfile;
  minecraft_material_code?: string;
};

let wired = false;

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function runtimeDefinition(name: string): RuntimeToolDefinition {
  const definition = getAllToolDefinitions()[name] as
    | RuntimeToolDefinition
    | undefined;
  if (!definition) {
    throw new Error(`Texture alpha runtime requires ${name}.`);
  }
  return definition;
}

function alphaIntent(args: Record<string, unknown>): AlphaIntent | null {
  const renderProfile =
    typeof args.render_profile === "string"
      ? (args.render_profile as EntityRenderProfile)
      : undefined;
  const materialCode =
    typeof args.minecraft_material_code === "string"
      ? args.minecraft_material_code
      : undefined;

  if (!renderProfile && !materialCode) return null;
  if (renderProfile && materialCode) {
    throw new Error(
      "Render-aware get_texture accepts render_profile or minecraft_material_code, not both."
    );
  }
  if (renderProfile === "custom") {
    throw new Error(
      "Custom render evidence requires minecraft_material_code so its semantics remain explicitly unverified."
    );
  }
  return {
    render_profile: renderProfile,
    minecraft_material_code: materialCode,
  };
}

function textureForEvidence(args: Record<string, unknown>): Texture {
  const reference = typeof args.texture === "string" ? args.texture : undefined;
  const texture = reference
    ? resolveCoreTexture(
        reference,
        "Use list_textures to confirm the intended texture UUID or unique exact name."
      )
    : Texture.getDefault();
  if (!texture) {
    throw new Error("No texture is available for render-aware alpha evidence.");
  }
  return texture;
}

function regionFromArgs(
  args: Record<string, unknown>,
  width: number,
  height: number
) {
  const raw = objectRecord(args.region);
  const region = raw
    ? {
        x: Number(raw.x),
        y: Number(raw.y),
        width: Number(raw.width),
        height: Number(raw.height),
      }
    : undefined;
  return normalizeTextureEvidenceRegion(region, width, height);
}

function renderAwareAlphaEvidence(
  args: Record<string, unknown>,
  intent: AlphaIntent
) {
  const texture = textureForEvidence(args);
  const width = texture.canvas.width;
  const height = texture.canvas.height;
  const region = regionFromArgs(args, width, height);
  const data = texture.ctx.getImageData(
    region.x,
    region.y,
    region.width,
    region.height
  ).data;
  return {
    ...analyzeRenderAwareAlpha({
      pixels: new Uint8ClampedArray(data),
      ...intent,
    }),
    evidence: {
      texture_uuid: texture.uuid,
      texture_name: texture.name,
      bitmap: { width, height },
      region,
    },
    efficiency: {
      opt_in: true,
      region_only: true,
      extra_scan_when_render_semantics_requested: true,
    },
  };
}

/**
 * Adds render-profile-aware alpha interpretation to the existing get_texture
 * evidence route. No extra public tool and no extra pixel read for normal calls.
 */
export function wireTextureAlphaRuntime(): void {
  if (wired) return;
  const getTexture = runtimeDefinition("get_texture");
  const original = getTexture.execute.bind(getTexture);
  getTexture.execute = async (args, context) => {
    const intent = alphaIntent(args);
    const result = await original(args, context);
    if (!intent) return result;

    const record = objectRecord(result);
    const structured = record ? objectRecord(record.structuredContent) : null;
    if (!record || !structured) return result;
    return {
      ...record,
      structuredContent: {
        ...structured,
        render_alpha: renderAwareAlphaEvidence(args, intent),
      },
    };
  };
  wired = true;
}
