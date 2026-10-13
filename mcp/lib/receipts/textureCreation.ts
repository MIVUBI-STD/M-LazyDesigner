import { z } from "zod";

/**
 * Minimum native identity and bitmap evidence for create_texture.
 *
 * Both blank and template paths return textureInventoryEntry(texture).
 * Color/style/UV approval is deliberately excluded: these fields prove
 * reported texture existence only, not successful visual authoring.
 */
export const textureCreationReceiptSchema = z.object({
  texture: z.object({
    uuid: z.string().min(1),
    name: z.string().min(1),
    bitmap: z.object({
      width: z.number().finite().positive(),
      height: z.number().finite().positive(),
    }),
  }),
});

export function isTextureCreationReceipt(value: unknown): boolean {
  return textureCreationReceiptSchema.safeParse(value).success;
}
