import {
  compactGatewayCapabilityStructuredContent,
} from "../gateway/contract";
import { projectCapabilityInputSchema } from "../gateway/schemaProjection";
import { buildControlDelta, decorateCapabilities, projectCapabilitiesForSearch, projectControlDeltaForGateway } from "../gateway/control";

export type PayloadMeasurement = {
  name: string;
  before_bytes: number;
  after_bytes: number;
  saved_bytes: number;
  reduction_percent: number;
};

export function serializedUtf8Bytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export function payloadMeasurement(
  name: string,
  before: unknown,
  after: unknown
): PayloadMeasurement {
  const beforeBytes = serializedUtf8Bytes(before);
  const afterBytes = serializedUtf8Bytes(after);
  const savedBytes = Math.max(0, beforeBytes - afterBytes);
  return {
    name,
    before_bytes: beforeBytes,
    after_bytes: afterBytes,
    saved_bytes: savedBytes,
    reduction_percent:
      beforeBytes === 0 ? 0 : Number(((savedBytes / beforeBytes) * 100).toFixed(2)),
  };
}

function manageCubesFixture() {
  return {
    modified: 4,
    effects: Array.from({ length: 4 }, (_, index) => ({
      before: {
        uuid: `cube-${index}`,
        from: [index, 0, 0],
        to: [index + 4, 12, 4],
        face_uvs: {
          north: [0, 0, 4, 12],
          south: [4, 0, 8, 12],
          east: [8, 0, 12, 12],
          west: [12, 0, 16, 12],
        },
      },
      after: {
        uuid: `cube-${index}`,
        name: `leg-${index}`,
        from: [index + 1, 0, 0],
        to: [index + 5, 12, 4],
        size: [4, 12, 4],
        origin: [0, 0, 0],
        rotation: [0, 0, 0],
        inflate: 0,
        box_uv: true,
        uv_offset: [0, 0],
        box_uv_region: { logical_rect: [0, 0, 16, 12] },
        mirror_uv: false,
        autouv: 1,
        visibility: true,
        face_uvs: {
          north: [0, 0, 4, 12],
          south: [4, 0, 8, 12],
          east: [8, 0, 12, 12],
          west: [12, 0, 16, 12],
        },
      },
      geometry_effect: {
        changed_fields: ["from", "to"],
        center_delta: [1, 0, 0],
      },
    })),
  };
}

function inspectSchemaFixture() {
  const properties = Object.fromEntries(
    [
      "mode",
      "include_cubes",
      "max_depth",
      "max_nodes",
      "name_pattern",
      "name_contains",
      "type",
      "parent_group",
      "min_size",
      "max_size",
      "selected_only",
      "limit",
      "id",
      "detail",
      "faces",
      "uv",
      "texture",
      "animation",
      "metadata",
      "diagnostics",
    ].map((field) => [field, { type: "string", description: `fixture ${field}` }])
  );
  return {
    type: "object",
    properties,
    required: ["mode"],
  };
}

export function measureAstraContextPayloads(): PayloadMeasurement[] {
  const cubeBefore = manageCubesFixture();
  const cubeAfter = compactGatewayCapabilityStructuredContent(
    "manage_cubes",
    cubeBefore
  );

  const searchBefore = decorateCapabilities([
    {
      capability_id: "manage_cubes",
      description: "Create or update Bedrock cubes.",
      tier: "primary",
      read_only: false,
      destructive: true,
      idempotent: false,
    },
    {
      capability_id: "inspect_elements",
      description: "Inspect Bedrock hierarchy or one element.",
      tier: "primary",
      read_only: true,
      destructive: false,
      idempotent: true,
    },
  ]);
  const searchAfter = projectCapabilitiesForSearch(searchBefore);

  const inspectBefore = inspectSchemaFixture();
  const inspectAfter = projectCapabilityInputSchema(
    "inspect_elements",
    inspectBefore,
    { field: "mode", value: "detail" }
  ).inputSchema;

  const deltaBefore = buildControlDelta({
    capability: "manage_cubes",
    phaseBefore: "geometry",
    phaseAfter: "geometry",
    projectUuid: "fixture-project",
    succeeded: true,
    result: {
      execution: "applied",
      geometry_effect: { changed_fields: ["rotation"] },
    },
  });
  const deltaAfter = projectControlDeltaForGateway(deltaBefore);

  return [
    payloadMeasurement("control_delta_continuation", deltaBefore, deltaAfter),
    payloadMeasurement("capability_search_projection", searchBefore, searchAfter),
    payloadMeasurement("manage_cubes_continuation", cubeBefore, cubeAfter),
    payloadMeasurement("inspect_elements_detail_schema", inspectBefore, inspectAfter),
  ];
}

if (import.meta.main) {
  console.log(
    JSON.stringify(
      {
        schema: 1,
        metric: "serialized_utf8_bytes_not_model_tokens",
        note:
          "Use this as a deterministic payload regression signal only. Astra token savings must be confirmed from real Codex usage telemetry.",
        measurements: measureAstraContextPayloads(),
      },
      null,
      2
    )
  );
}
