import { z } from "zod";

const BEDROCK_GEOMETRY_IDENTIFIER =
  /^geometry\.[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*$/;

/**
 * Generator-ready explicit project identifier input. Local public wiring may add
 * this to create_project without inventing a second validation rule.
 */
export const bedrockGeometryIdentifierInputSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => {
      try {
        normalizeBedrockGeometryIdentifier(value);
        return true;
      } catch {
        return false;
      }
    },
    {
      message:
        "Bedrock geometry identifier must resolve to geometry.<segments> using only letters, numbers, underscores, and periods.",
    }
  )
  .describe(
    "Optional native Bedrock model identifier. `geometry.` is added when omitted; explicit user value wins over the project-name default."
  );

export function normalizeBedrockGeometryIdentifier(requested: string): string {
  const trimmed = requested.trim();
  if (!trimmed) {
    throw new Error("Bedrock geometry identifier must not be blank.");
  }

  const body = /^geometry\./i.test(trimmed)
    ? trimmed.slice(trimmed.indexOf(".") + 1)
    : trimmed;
  const normalized = `geometry.${body}`;
  if (!BEDROCK_GEOMETRY_IDENTIFIER.test(normalized)) {
    throw new Error(
      "Bedrock geometry identifier must use geometry.<segments> with letters, numbers, underscores, and periods only."
    );
  }
  return normalized;
}

export function projectNameToBedrockIdentifierSlug(projectName: string): string {
  const slug = projectName
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!slug) {
    throw new Error(
      "Project name cannot produce a Bedrock identifier slug; provide an explicit model_identifier."
    );
  }
  return slug;
}

/**
 * New projects own their Bedrock geometry identifier immediately. An explicit
 * user identifier is authoritative; otherwise the deterministic default is
 * geometry.<project_slug>. Runtime wiring must assign this to Project.model_identifier
 * rather than repairing compiled JSON later.
 */
export function resolveBedrockProjectModelIdentifier(
  projectName: string,
  explicitIdentifier?: string
): string {
  if (explicitIdentifier !== undefined) {
    return normalizeBedrockGeometryIdentifier(explicitIdentifier);
  }
  return `geometry.${projectNameToBedrockIdentifierSlug(projectName)}`;
}
