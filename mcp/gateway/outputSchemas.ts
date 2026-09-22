import { z } from "zod";

const hex64 = z.string().regex(/^[a-f0-9]{64}$/);

export const gatewayErrorOutputSchema = z
  .object({
    code: z.string().min(1),
    message: z.string(),
    recovery: z.unknown(),
  })
  .passthrough();

const contextHandleSchema = z
  .object({
    id: z.string().min(1),
    path: z.string().min(1),
    sha256: hex64,
  })
  .strict();

const controlContextSchema = z
  .object({
    required: z.array(contextHandleSchema).optional(),
    optional: z.array(contextHandleSchema).optional(),
    invalidated_ids: z.array(z.string()).optional(),
  })
  .passthrough();

const gatewayControlSchema = z
  .object({
    system: z.enum(["READY", "DEGRADED", "OFFLINE"]),
    task_context_id: z.string().regex(/^task:[a-f0-9]{20}$/),
    context: controlContextSchema,
  })
  .passthrough();

export const gatewayStatusSuccessOutputSchema = z
  .object({
    gateway: z.literal("ready"),
    affinity: z
      .object({
        project_uuid: z.string().nullable(),
        authoring_phase: z
          .enum(["geometry", "texturing", "animation"])
          .nullable(),
      })
      .passthrough(),
    runtime: z
      .object({
        online: z.boolean(),
        mcp_client_ready: z.boolean(),
        catalog_stale: z.boolean(),
        catalog_count: z.number().int().nonnegative(),
        semantic_catalog_revision: hex64,
        semantic_catalog_revisions: semanticRevisionsSchema,
        semantic_freshness: z
          .object({
            status: z.enum(["FRESH", "STALE", "MISSING"]),
            dimensions: z.record(
              z.enum(["routing", "graph", "schema_projection", "aggregate"]),
              z.enum(["FRESH", "STALE", "MISSING"])
            ),
            stale_dimensions: z.array(
              z.enum(["routing", "graph", "schema_projection", "aggregate"])
            ),
            missing_dimensions: z.array(
              z.enum(["routing", "graph", "schema_projection", "aggregate"])
            ),
            refresh_surfaces: z.array(
              z.enum([
                "CAPABILITY_SEARCH",
                "DESCRIBE_SCHEMA",
                "AI_CONTEXT",
                "SEMANTIC_MANIFEST",
              ])
            ),
          })
          .strict()
          .optional(),
        identity: z.record(z.string(), z.unknown()),
      })
      .passthrough(),
    connection: z
      .object({
        state: z.string().min(1),
      })
      .passthrough(),
    operations: z
      .object({
        active: z.number().int().nonnegative(),
        queued: z.number().int().nonnegative(),
      })
      .passthrough(),
    control: gatewayControlSchema,
  })
  .passthrough();

const capabilityBranchSchema = z
  .object({
    field: z.string().min(1),
    value: z.string().min(1),
  })
  .strict();

const semanticRevisionsSchema = z
  .object({
    routing: hex64,
    graph: hex64,
    schema_projection: hex64,
    aggregate: hex64,
  })
  .strict();

const semanticArtifactStampSchema = z
  .object({
    semantic_revision_schema: z.literal(1),
    artifact_kind: z.enum([
      "DOCS_API",
      "DESCRIBE_REPORT",
      "AI_STAGE_CONTEXT",
      "CAPABILITY_MANIFEST",
    ]),
    revisions: semanticRevisionsSchema,
  })
  .strict();

const capabilityPredecessorSchema = z
  .object({
    capability: z.string().min(1),
    branch: capabilityBranchSchema.optional(),
  })
  .strict();

export const gatewaySearchCapabilitySchema = z
  .object({
    capability_id: z.string().min(1),
    hint: z.string().optional(),
    branch: capabilityBranchSchema.optional(),
    why: z.string().optional(),
    eligibility: z.enum(["READY", "UNKNOWN", "BLOCKED"]).optional(),
    requires: z.array(z.string()).optional(),
    predecessor: capabilityPredecessorSchema.optional(),
    tier: z.enum(["primary", "support", "experimental", "maintenance"]),
    authoring_domain: z.enum(["GEOMETRY", "TEXTURING", "ANIMATION", "CORE"]),
    flags: z
      .array(z.enum(["read_only", "destructive", "idempotent"]))
      .optional(),
  })
  .passthrough();

export const gatewaySearchSuccessOutputSchema = z
  .object({
    capabilities: z.array(gatewaySearchCapabilitySchema).max(8),
  })
  .strict();

export const gatewayDescribeCapabilitySchema = z
  .object({
    semantic_id: z.string().min(1),
    semantic_revision: hex64,
    semantic: semanticArtifactStampSchema,
    inputSchema: z.record(z.string(), z.unknown()),
  })
  .passthrough();

export const gatewayDescribeSuccessOutputSchema = z
  .object({
    capability: gatewayDescribeCapabilitySchema,
  })
  .strict();

export const gatewayStatusOutputSchema = z.union([
  gatewayStatusSuccessOutputSchema,
  gatewayErrorOutputSchema,
]);

export const gatewaySearchOutputSchema = z.union([
  gatewaySearchSuccessOutputSchema,
  gatewayErrorOutputSchema,
]);

export const gatewayDescribeOutputSchema = z.union([
  gatewayDescribeSuccessOutputSchema,
  gatewayErrorOutputSchema,
]);
