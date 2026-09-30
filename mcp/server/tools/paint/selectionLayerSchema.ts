import { z } from "zod";
import { textureIdOptionalSchema } from "@/lib/schemas/ids";

const textureLayerBlendModeEnum = z.enum([
  "default",
  "set_opacity",
  "color",
  "multiply",
  "add",
  "darken",
  "lighten",
  "screen",
  "overlay",
  "difference",
  "alpha_mask",
]);

/**
 * Pixel operations reject out-of-bounds coordinates instead of letting the
 * native painter silently clip/wrap/ignore them while still reporting success.
 */

export const textureSelectionParameters = z.object({
  action: z
    .enum([
      "select_rectangle",
      "select_ellipse",
      "select_all",
      "clear_selection",
      "invert_selection",
      "expand_selection",
      "contract_selection",
    ])
    .describe("Selection action."),
  texture_id: textureIdOptionalSchema,
  coordinates: z
    .object({
      x1: z.number().describe("Start X coordinate."),
      y1: z.number().describe("Start Y coordinate."),
      x2: z.number().describe("End X coordinate."),
      y2: z.number().describe("End Y coordinate."),
    })
    .optional(),
  radius: z
    .number()
    .int()
    .nonnegative()
    .optional(),
  mode: z
    .enum(["create", "add", "subtract", "intersect"])
    .optional()
    .default("create"),
});

export const textureLayerManagementParameters = z.object({
  action: z
    .enum([
      "create_layer",
      "delete_layer",
      "duplicate_layer",
      "merge_down",
      "set_opacity",
      "set_blend_mode",
      "move_layer",
      "rename_layer",
      "flatten_layers",
      "batch_metadata",
    ]),
  texture_id: textureIdOptionalSchema,
  layer_id: z.string().min(1).optional(),
  layer_name: z.string().min(1).optional(),
  opacity: z.number().min(0).max(100).optional(),
  blend_mode: textureLayerBlendModeEnum.optional(),
  target_index: z.number().int().nonnegative().optional(),
  updates: z
    .array(
      z
        .object({
          layer_id: z.string().min(1),
          name: z.string().min(1).optional(),
          opacity: z.number().min(0).max(100).optional(),
          blend_mode: textureLayerBlendModeEnum.optional(),
          target_index: z.number().int().nonnegative().optional(),
        })
        .strict()
        .refine(
          (value) =>
            value.name !== undefined ||
            value.opacity !== undefined ||
            value.blend_mode !== undefined ||
            value.target_index !== undefined,
          "Each batch_metadata update must change name, opacity, blend_mode, or target_index."
        )
    )
    .min(1)
    .max(64)
    .optional(),
}).superRefine((value, ctx) => {
  const needsLayer =
    value.action !== "create_layer" &&
    value.action !== "flatten_layers" &&
    value.action !== "batch_metadata";
  if (needsLayer && !value.layer_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["layer_id"],
      message: `layer_id is required for ${value.action}; editor selection is not a semantic target.`,
    });
  }
  if (value.action === "rename_layer" && !value.layer_name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["layer_name"],
      message: "layer_name is required for rename_layer.",
    });
  }
  if (value.action === "set_opacity" && value.opacity === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["opacity"],
      message: "opacity is required for set_opacity.",
    });
  }
  if (value.action === "set_blend_mode" && !value.blend_mode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["blend_mode"],
      message: "blend_mode is required for set_blend_mode.",
    });
  }
  if (value.action === "move_layer" && value.target_index === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["target_index"],
      message: "target_index is required for move_layer.",
    });
  }
  if (value.action === "batch_metadata" && !value.updates) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["updates"],
      message: "updates is required for batch_metadata.",
    });
  }
});
