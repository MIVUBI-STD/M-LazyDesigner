/// <reference types="three" />
/// <reference types="blockbench-types" />

import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_EXPERIMENTAL } from "@/lib/constants";
import { resolveCoreTexture } from "@/lib/coreIdentity";
import { isAbsoluteFilesystemPath } from "@/lib/util";
import {
  colorSchema,
  pbrChannelEnum,
  renderModeEnum,
  renderSidesEnum,
  textureIdOptionalSchema,
} from "@/lib/zodObjects";
import {
  buildUvAtlasAudit,
  collectUvAtlasUsages,
  requireTextureCreationPreflight,
  textureInventoryEntry,
  textureProductionRole,
} from "./texture-atlas";
import { resolveTextureToolMaterial } from "./texture-materials";

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


export const createTextureToolDoc: ToolSpec = {
  name: "create_texture",
  description:
    "Creates a texture and returns compact metadata. Use get_texture only when image data is needed.",
  annotations: {
    title: "Create Texture",
    destructiveHint: true,
    openWorldHint: true,
  },
  parameters: createTextureParameters,
  status: STATUS_EXPERIMENTAL,
};

export async function runNativeTemplateEdit<T>(generate: () => Promise<void>, accept: () => T): Promise<T> {
  if (Undo.current_save) throw new Error("Finish the current edit before generating a template.");
  const project = Project;
  const saved = project.saved;
  const history = [...Undo.history];
  const index = Undo.index;
  const aspects = (): UndoAspects => ({ elements: [...Cube.all], textures: [...Texture.all], bitmap: true, uv_only: true, uv_mode: true, selected_texture: true, texture_order: true });
  Undo.initEdit(aspects());
  const before = Undo.current_save!;
  Undo.cancelEdit(false);
  try {
    await generate();
    const entry = Undo.history[Undo.index - 1];
    if (!entry || history.includes(entry)) throw new Error("Native template generation was cancelled before completion.");
    const result = accept();
    // Include the existing atlas in rebuild Undo, and any post-generation metadata.
    Undo.initEdit(aspects());
    entry.before = before;
    entry.post = Undo.current_save!;
    Undo.cancelEdit(false);
    return result;
  } catch (error) {
    Undo.initEdit(aspects());
    const current = Undo.current_save!;
    Undo.cancelEdit(false);
    Undo.loadSave(before, current);
    Undo.history.splice(0, Undo.history.length, ...history);
    Undo.index = index;
    project.saved = saved;
    Canvas.updateAll();
    throw error;
  } finally {
    if (Dialog.open?.id === "generate_template_progress") Dialog.open.hide();
    Blockbench.setProgress(0);
  }
}


export function registerCreateTextureTool(): void {
  createTool(createTextureToolDoc.name, {
      ...createTextureToolDoc,
      parameters: createTextureParameters,
      async execute({
        name,
        texture_id,
        type,
        width,
        height,
        pixel_density,
        rearrange_uv,
        power_of_two,
        keep_multi_texture_occupancy,
        padding,
        data,
        pbr_channel,
        fill_color,
        group,
        layer_name,
        render_mode,
        render_sides,
      }) {
        const textureGroup =
          group !== undefined ? resolveTextureToolMaterial(group) : undefined;
  
        const rebuildTexture = texture_id === undefined ? undefined : resolveCoreTexture(texture_id, "Use list_textures to identify the base atlas.");
        if (rebuildTexture) {
          const baseAtlases = Texture.all.filter(texture => textureProductionRole(texture) === "base_color_candidate");
          if (baseAtlases.length !== 1 || baseAtlases[0] !== rebuildTexture) {
            throw new Error("Template rebuild requires the single existing base-color atlas.");
          }
          if (Texture.all.some(texture => texture !== rebuildTexture)) {
            throw new Error("Rebuild UV before adding variants or PBR channels; dependent atlases require matching remapping.");
          }
        } else requireTextureCreationPreflight({
          width,
          height,
          data,
          pbr_channel,
          textureGroup,
        });
  
        if (type === "template") {
          if (group !== undefined) {
            throw new Error(
              "Template mode creates the single base-color atlas; assign it to a material group after UV generation."
            );
          }
  
          const generator = (
            globalThis as typeof globalThis & {
              TextureGenerator?: {
                generateTemplate: (
                  options: Record<string, unknown>,
                  callback: (dataUrl: string) => Texture
                ) => Promise<void>;
              };
            }
          ).TextureGenerator;
          if (!generator?.generateTemplate) {
            throw new Error(
              "Blockbench TextureGenerator is unavailable. Reload BlockIT/Blockbench before creating a texture template."
            );
          }
  
          // The native callback route uses all visible elements for Bedrock's
          // single atlas; changing the user's selection is unnecessary.
          if (!Cube.all.some(cube => cube.visibility)) {
            throw new Error(
              "Template generation requires at least one visible Cube."
            );
          }
  
          const nativeColor = fill_color
            ? (globalThis as typeof globalThis & { tinycolor?: (value: unknown) => unknown })
              .tinycolor?.(
                Array.isArray(fill_color)
                  ? {
                    r: Number(fill_color[0]),
                    g: Number(fill_color[1]),
                    b: Number(fill_color[2]),
                    a: Number(fill_color[3] ?? 255) / 255,
                  }
                  : fill_color
              )
            : undefined;
  
          let templateTexture: Texture | undefined;
          return await runNativeTemplateEdit(async () => {
              await generator.generateTemplate({
                name,
                type: "template",
                resolution: pixel_density,
                color: nativeColor,
                rearrange_uv,
                power: power_of_two,
                double_use: keep_multi_texture_occupancy,
                padding,
                particle: "auto",
                texture: rebuildTexture ?? Texture.getDefault(),
              }, (dataUrl: string) => {
                  templateTexture = rebuildTexture
                    ? rebuildTexture.updateSource(dataUrl)
                    : new Texture({ name, keep_size: true }).fromDataURL(dataUrl).add(false).select();
                  return templateTexture;
              });
              if (templateTexture) await templateTexture.img.decode();
              Canvas.updateAll();
          }, () => {
          if (!templateTexture) {
            throw new Error("Blockbench did not return the generated texture template.");
          }
          const templateUvAudit = buildUvAtlasAudit(
            collectUvAtlasUsages(),
            templateTexture.getUVWidth(),
            templateTexture.getUVHeight()
          );
          if (
            templateUvAudit.state !== "available" ||
            templateUvAudit.invalid_uv.count > 0 ||
            templateUvAudit.out_of_bounds.count > 0 ||
            templateUvAudit.production_gate.state !== "ready"
          ) {
            throw new Error(
              `Native template generation finished without a valid UV atlas. The edit was rolled back; inspect the affected geometry/UV before retrying. Reasons: ${templateUvAudit.state === "available" ? templateUvAudit.production_gate.reasons.join(", ") : templateUvAudit.reason}`
            );
          }
          templateTexture.render_mode = render_mode;
          templateTexture.render_sides = render_sides;
          if (fill_color && layer_name) {
            templateTexture.activateLayers(false);
            templateTexture.getActiveLayer().name = layer_name;
          }
          Canvas.updateAll();
  
          const templateResult = {
            texture: {
              ...textureInventoryEntry(templateTexture),
              uuid: templateTexture.uuid,
            },
            template: {
              pixel_density,
              pixels_per_model_unit: pixel_density / 16,
              rearranged_uv: rearrange_uv,
              power_of_two: power_of_two,
              keep_multi_texture_occupancy,
              padding,
              uv_locked: true,
            },
            uv_audit: templateUvAudit,
            rebuilt: Boolean(rebuildTexture),
          };
          return {
            content: [
              {
                type: "text" as const,
                text: `Created texture template "${templateTexture.name}" (${templateTexture.uuid}) with native UV generation at ${pixel_density}x. Paint only after inspecting the returned UV/atlas evidence.`,
              },
            ],
            structuredContent: templateResult,
          };
          });
        }
  
        Undo.initEdit({
          textures: [],
          collections: [],
        });
  
        let texture!: Texture;
  
        try {
          texture = new Texture({
            name,
            width,
            height,
            group: textureGroup?.uuid,
            pbr_channel,
            render_mode,
            render_sides,
            internal: true,
          });
  
          if (data) {
            if (data.startsWith("data:image/")) {
              texture.source = data;
              texture.width = width;
              texture.height = height;
            } else {
              texture = texture.fromFile({
                name: data.split(/[\/\\]/).pop() || data,
                path: data.replace(/^file:\/\//, ""),
              });
            }
  
            texture.load();
            texture.fillParticle();
            texture.layers_enabled = false;
          } else {
            const { ctx } = texture.getActiveCanvas();
  
            if (
              ctx.canvas.width !== texture.width ||
              ctx.canvas.height !== texture.height
            ) {
              ctx.canvas.width = texture.width;
              ctx.canvas.height = texture.height;
            }
  
            if (fill_color) {
              const color = Array.isArray(fill_color)
                // @ts-ignore - tinycolor is available globally in Blockbench
                ? tinycolor({
                  r: Number(fill_color[0]),
                  g: Number(fill_color[1]),
                  b: Number(fill_color[2]),
                  a: Number(fill_color[3] ?? 255) / 255,
                })
                // @ts-ignore - tinycolor ok
                : tinycolor(fill_color);
  
              ctx.fillStyle = color.toRgbString().toLowerCase();
              ctx.fillRect(0, 0, texture.width, texture.height);
            } else {
              ctx.clearRect(0, 0, texture.width, texture.height);
            }
  
            texture.updateSource(ctx.canvas.toDataURL("image/png", 1));
            texture.updateLayerChanges(true);
          }
  
          texture.add();
  
          if (fill_color && layer_name) {
            texture.activateLayers(false);
            texture.getActiveLayer().name = layer_name;
          }
  
          Undo.finishEdit("Agent created texture", {
            textures: [texture],
            collections: [],
          });
        } catch (error) {
          if (texture) texture.remove(true);
          Undo.cancelEdit();
          Canvas.updateAll();
          throw error;
        }
  
        Canvas.updateAll();
  
        const result = {
          texture: {
            ...textureInventoryEntry(texture),
            uuid: texture.uuid,
          },
        };
        return {
          content: [
            {
              type: "text" as const,
              text: `Created texture "${texture.name}" (${texture.uuid}). Use get_texture only when image evidence is needed.`,
            },
          ],
          structuredContent: result,
        };
      },
    }, createTextureToolDoc.status);
}
