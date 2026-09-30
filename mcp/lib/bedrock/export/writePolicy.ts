import { planBedrockGeometryWrite } from "./integrity";

export type BedrockGeometryWritePlan = ReturnType<typeof planBedrockGeometryWrite>;

/**
 * BlockIT v1 writes directly only when creating a new geometry file or replacing
 * one explicitly owned single-geometry file. Multi-geometry destinations remain
 * fail-closed and must use Blockbench/native merge behavior; never implement a
 * custom JSON splice merely to bypass codec lifecycle semantics.
 */
export function requireDirectBedrockGeometryWriteV1(
  plan: BedrockGeometryWritePlan
): Extract<BedrockGeometryWritePlan, { action: "CREATE_NEW" | "REPLACE_SINGLE" }> {
  if (plan.action === "CREATE_NEW" || plan.action === "REPLACE_SINGLE") {
    return plan;
  }
  if (plan.action === "NATIVE_MERGE_REQUIRED") {
    throw new Error(
      "Bedrock geometry v1 refuses direct writes to multi-geometry files. Preserve the destination and use a tested native merge path; do not custom-splice JSON."
    );
  }
  if (plan.action === "OVERWRITE_CONSENT_REQUIRED") {
    throw new Error("Bedrock geometry overwrite requires explicit user consent before any write.");
  }
  throw new Error(
    "Bedrock geometry identifier must be repaired in native project metadata before export; compiled JSON is not the authority."
  );
}
