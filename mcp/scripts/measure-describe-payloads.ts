import "@/server/tools";
import { z } from "zod";
import { getAllToolDefinitions } from "@/lib/factories";
import {
  listCapabilitySchemaBranches,
  projectCapabilityInputSchema,
} from "@/gateway/schemaProjection";

const encoder = new TextEncoder();

function bytes(value: unknown): number {
  return encoder.encode(JSON.stringify(value)).byteLength;
}

export type DescribePayloadRow = {
  capability: string;
  full_input_schema_bytes: number;
  branch_count: number;
  projected_min_bytes: number | null;
  projected_max_bytes: number | null;
  projected_average_bytes: number | null;
  best_reduction_bytes: number;
  best_reduction_ratio: number;
  projection_status: "projected" | "unprojected";
};

export function measureDescribePayloads(): {
  rows: DescribePayloadRow[];
  large_unprojected: DescribePayloadRow[];
} {
  const definitions = getAllToolDefinitions();
  const rows = Object.entries(definitions).map(([capability, definition]) => {
    const inputSchema = z.toJSONSchema(definition.parameterSchema, {
      io: "input",
      target: "draft-2020-12",
      unrepresentable: "any",
      reused: "inline",
    });
    const fullBytes = bytes(inputSchema);
    const branches = listCapabilitySchemaBranches(capability);
    const projectedBytes = branches.map((branch) =>
      bytes(
        projectCapabilityInputSchema(
          capability,
          inputSchema,
          branch
        ).inputSchema
      )
    );
    const projectedMin =
      projectedBytes.length > 0 ? Math.min(...projectedBytes) : null;
    const projectedMax =
      projectedBytes.length > 0 ? Math.max(...projectedBytes) : null;
    const projectedAverage =
      projectedBytes.length > 0
        ? Math.round(
            projectedBytes.reduce((sum, value) => sum + value, 0) /
              projectedBytes.length
          )
        : null;
    const bestReduction =
      projectedMin === null ? 0 : Math.max(0, fullBytes - projectedMin);

    return {
      capability,
      full_input_schema_bytes: fullBytes,
      branch_count: branches.length,
      projected_min_bytes: projectedMin,
      projected_max_bytes: projectedMax,
      projected_average_bytes: projectedAverage,
      best_reduction_bytes: bestReduction,
      best_reduction_ratio:
        fullBytes === 0 ? 0 : bestReduction / fullBytes,
      projection_status:
        branches.length > 0 ? ("projected" as const) : ("unprojected" as const),
    };
  });

  rows.sort(
    (left, right) =>
      right.full_input_schema_bytes - left.full_input_schema_bytes ||
      left.capability.localeCompare(right.capability)
  );

  const largeUnprojected = rows.filter(
    (row) =>
      row.projection_status === "unprojected" &&
      row.full_input_schema_bytes >= 2_000
  );

  return {
    rows,
    large_unprojected: largeUnprojected,
  };
}

if (import.meta.main) {
  const report = measureDescribePayloads();
  console.log(
    JSON.stringify(
      {
        measurement: "gateway-describe-payload-bytes",
        proof_scope:
          "Deterministic serialized-byte proxy for Gateway describe input schemas. It is not provider token telemetry.",
        ...report,
      },
      null,
      2
    )
  );
}
