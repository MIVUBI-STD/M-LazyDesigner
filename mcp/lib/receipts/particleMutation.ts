import { z } from "zod";

const diagnosticSchema = z.object({
  severity: z.enum(["error", "warning", "info"]),
  code: z.string(),
  message: z.string(),
  path: z.string().optional(),
});

const particleSummarySchema = z
  .object({
    identifier: z.string().nullable(),
    component_count: z.number().int().nonnegative(),
    diagnostics: z.array(diagnosticSchema),
  })
  .passthrough();

const particleWriteSchema = z.object({
  kind: z.literal("particle"),
  path: z.string().min(1),
  byte_length: z.number().int().positive(),
  replaced_existing: z.boolean(),
});

export const particleMutationReceiptSchema = z
  .object({
    valid: z.boolean(),
    artifact_ready: z.boolean(),
    source_path: z.string().nullable(),
    wrote_to_path: z.string().nullable(),
    preview_path: z.string().nullable(),
    preview_error: z.string().nullable(),
    byte_length: z.number().int().nonnegative(),
    operation_count: z.number().int().nonnegative(),
    summary: particleSummarySchema,
    writes: z.array(z.record(z.string(), z.unknown())),
  })
  .passthrough();

export function particleMutationReceipt<T extends Record<string, unknown>>(
  receipt: T
): T {
  particleMutationReceiptSchema.parse(receipt);
  return receipt;
}

export function isVerifiedParticleWriteReceipt(value: unknown): boolean {
  const parsed = particleMutationReceiptSchema.safeParse(value);
  if (!parsed.success) return false;

  const receipt = parsed.data;
  if (
    receipt.valid !== true ||
    receipt.artifact_ready !== true ||
    typeof receipt.wrote_to_path !== "string" ||
    receipt.wrote_to_path.length === 0 ||
    typeof receipt.summary.identifier !== "string" ||
    receipt.summary.identifier.length === 0
  ) {
    return false;
  }

  return receipt.writes.some((entry) => {
    const write = particleWriteSchema.safeParse(entry);
    return (
      write.success &&
      write.data.path === receipt.wrote_to_path
    );
  });
}
