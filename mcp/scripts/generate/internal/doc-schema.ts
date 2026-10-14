import { z } from "zod";

// The generated API is an executable contract, not a best-effort summary.
// A failed conversion must abort generation instead of publishing a plausible
// but incorrect permissive placeholder as if the schema were valid.
type SchemaConverter = (schema: z.ZodType) => object;

export function convertDocSchema(
  name: string,
  schema: z.ZodType,
  converter: SchemaConverter = (value) =>
    z.toJSONSchema(value, {
      io: "input",
      target: "draft-2020-12",
      unrepresentable: "any",
      reused: "inline",
    })
): object {
  try {
    return converter(schema);
  } catch (cause) {
    throw new Error(`Cannot generate MCP API schema for "${name}".`, {
      cause,
    });
  }
}
