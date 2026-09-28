import { z } from "zod";

export const createProjectReceiptSchema = z.object({
  project: z.object({
    uuid: z.string().min(1),
    name: z.string().min(1),
    save_path: z.string().nullable(),
    export_path: z.string().nullable(),
    export_codec: z.string().nullable(),
    saved: z.boolean(),
  }),
  format: z.object({
    id: z.literal("bedrock"),
  }),
  resolution: z.object({
    texture_width: z.number().finite().positive().nullable(),
    texture_height: z.number().finite().positive().nullable(),
  }),
});

export const phaseTransitionReceiptSchema = z.object({
  phase: z.enum(["geometry", "texturing", "animation"]),
  runtime_surface: z.string().min(1),
  reason: z.string().min(1),
  resume_from: z.string().min(1),
  readiness: z.unknown().optional(),
  readiness_summary: z.unknown().nullable(),
  surface_changed: z.boolean(),
  reload_required: z.literal(false),
  action: z.string().min(1),
}).strict();

export function createProjectReceipt<T extends Record<string, unknown>>(
  receipt: T
): T {
  createProjectReceiptSchema.parse(receipt);
  return receipt;
}

export function phaseTransitionReceipt<T extends Record<string, unknown>>(
  receipt: T
): T {
  phaseTransitionReceiptSchema.parse(receipt);
  return receipt;
}

export function isCreateProjectReceipt(value: unknown): boolean {
  return createProjectReceiptSchema.safeParse(value).success;
}

export function isPhaseTransitionReceipt(value: unknown): boolean {
  return phaseTransitionReceiptSchema.safeParse(value).success;
}
