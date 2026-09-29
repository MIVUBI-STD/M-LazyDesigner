import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { toolManifest } from "@/build/docs-manifest";
import { projectCapabilityInputSchema } from "@/gateway/capabilities/schemaProjection";

function jsonSchema(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema, {
    io: "input",
    target: "draft-2020-12",
    unrepresentable: "any",
    reused: "inline",
  }) as Record<string, unknown>;
}

function objectVariants(schema: unknown): Array<Record<string, unknown>> {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return [];
  const value = schema as Record<string, unknown>;
  for (const key of ["anyOf", "oneOf"] as const) {
    const variants = value[key];
    if (Array.isArray(variants)) return variants.flatMap(objectVariants);
  }
  return value.properties &&
    typeof value.properties === "object" &&
    !Array.isArray(value.properties)
    ? [value]
    : [];
}

describe("branch schema projection completeness", () => {
  test("every declared branch preserves its source-owned input fields", () => {
    for (const group of toolManifest) {
      for (const tool of group.tools) {
        if (!tool.branches) continue;

        const fullSchema = jsonSchema(tool.parameters);
        for (const [value, branchSchema] of Object.entries(tool.branches.schemas)) {
          const source = jsonSchema(branchSchema);
          const label = tool.name + ":" + value;
          const projected = projectCapabilityInputSchema(
            tool.name,
            fullSchema,
            { field: tool.branches.discriminator, value }
          );

          expect(projected.projected, label).toBe(true);

          const sourceVariants = objectVariants(source);
          const projectedVariants = objectVariants(projected.inputSchema);
          expect(projectedVariants.length, label + ":projected variants").toBeGreaterThan(0);

          const sourceFields = new Set(
            sourceVariants.flatMap((variant) =>
              Object.keys(
                (variant.properties as Record<string, unknown> | undefined) ?? {}
              )
            )
          );
          const projectedFields = new Set(
            projectedVariants.flatMap((variant) =>
              Object.keys(
                (variant.properties as Record<string, unknown> | undefined) ?? {}
              )
            )
          );

          for (const field of sourceFields) {
            expect(
              projectedFields.has(field),
              label + " missing projected field " + field
            ).toBe(true);
          }

          const sourceRequired = new Set(
            sourceVariants.flatMap((variant) =>
              Array.isArray(variant.required)
                ? variant.required.filter(
                    (field): field is string => typeof field === "string"
                  )
                : []
            )
          );
          const projectedRequired = new Set(
            projectedVariants.flatMap((variant) =>
              Array.isArray(variant.required)
                ? variant.required.filter(
                    (field): field is string => typeof field === "string"
                  )
                : []
            )
          );

          for (const field of sourceRequired) {
            expect(
              projectedRequired.has(field),
              label + " missing required field " + field
            ).toBe(true);
          }
        }
      }
    }
  });
});
