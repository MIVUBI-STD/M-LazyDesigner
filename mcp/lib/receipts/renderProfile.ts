import { z } from "zod";

export const renderProfileWriteReceiptSchema = z.object({
  key: z.enum(["client_entity", "render_controller"]),
  path: z.string().min(1),
  byte_length: z.number().int().positive(),
  replaced_existing: z.boolean(),
  transaction: z.enum(["single_atomic", "paired_atomic"]),
});

const renderProfileSummarySchema = z.object({
  slots: z.array(z.unknown()),
  assignments: z.array(z.unknown()).optional(),
  diagnostics: z.array(z.unknown()),
});

const assignReceiptSchema = z.object({
  execution: z.literal("applied"),
  action: z.literal("render_profile"),
  operation: z.enum(["assign", "unassign"]),
  write: renderProfileWriteReceiptSchema,
  render_controller: z.string(),
  bone_pattern: z.string(),
  slot: z.string().optional(),
}).superRefine((value, ctx) => {
  if (value.operation === "assign" && value.slot === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["slot"],
      message: "Render-profile assign receipt requires slot.",
    });
  }
});

const setSlotReceiptSchema = z.object({
  execution: z.literal("applied"),
  action: z.literal("render_profile"),
  operation: z.literal("set_slot"),
  slot: z.string(),
  render_profile: z.string(),
  minecraft_material_code: z.string(),
  write: renderProfileWriteReceiptSchema,
  summary: renderProfileSummarySchema,
});

const bindReceiptSchema = z
  .object({
    execution: z.literal("applied"),
    action: z.literal("render_profile"),
    operation: z.literal("bind"),
    binding: z.object({
      slot: z.string(),
      minecraft_material_code: z.string(),
    }),
    write_transaction: z.object({
      state: z.enum(["single_atomic", "paired_atomic"]),
      write_count: z.number().int().positive(),
    }),
    client_entity_write: renderProfileWriteReceiptSchema.nullish(),
    render_controller_write: renderProfileWriteReceiptSchema.nullish(),
    summary: renderProfileSummarySchema,
  })
  .superRefine((value, ctx) => {
    const writes = [
      value.client_entity_write,
      value.render_controller_write,
    ].filter((entry) => entry != null);
    if (
      writes.length === 0 ||
      writes.length !== value.write_transaction.write_count
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["write_transaction", "write_count"],
        message: "Render-profile bind receipt write_count must match writes.",
      });
    }
  });

export const renderProfileMutationReceiptSchema = z.union([
  assignReceiptSchema,
  setSlotReceiptSchema,
  bindReceiptSchema,
]);

export function isRenderProfileMutationReceipt(value: unknown): boolean {
  return renderProfileMutationReceiptSchema.safeParse(value).success;
}

/**
 * Native render-profile authoring can return a compiled result without writing
 * any file. Such a result is state-neutral ONLY when its operation-specific
 * receipt explicitly proves the absence of disk writes. Successful reads and
 * unrecognized results do not prove a mutation branch was a no-op.
 */
const compileOnlyBindReceiptSchema = z.object({
  execution: z.literal("applied"),
  action: z.literal("render_profile"),
  operation: z.literal("bind"),
  binding: z.object({
    slot: z.string().min(1),
    minecraft_material_code: z.string().min(1),
  }),
  write_transaction: z.object({
    state: z.literal("compile_only"),
    write_count: z.literal(0),
  }),
  client_entity_write: z.null(),
  render_controller_write: z.null(),
});

const compileOnlySingleReceiptSchema = z.object({
  execution: z.literal("applied"),
  action: z.literal("render_profile"),
  operation: z.enum(["set_slot", "assign", "unassign"]),
  write: z.null(),
}).superRefine((receipt, ctx) => {
  // A write-null flag without the actual operation identity is insufficient.
  // The producer supplies a slot for set_slot/assign and a bone/controller
  // target for assign/unassign.
  if (receipt.operation === "set_slot" && !(
    "slot" in receipt && typeof receipt.slot === "string" && receipt.slot.length > 0
  )) {
    ctx.addIssue({ code: "custom", path: ["slot"], message: "Compiled slot requires its identity." });
  }
});

export const renderProfileNoWriteReceiptSchema = z.union([
  compileOnlyBindReceiptSchema,
  compileOnlySingleReceiptSchema,
]);

export function isRenderProfileNoWriteReceipt(value: unknown): boolean {
  return renderProfileNoWriteReceiptSchema.safeParse(value).success;
}
