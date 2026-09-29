export {
  BEDROCK_PARTICLE_FORMAT_VERSION,
  BEDROCK_PARTICLE_PRESETS,
  BEDROCK_PARTICLE_COMPONENT_REFERENCE,
  BEDROCK_PARTICLE_CURVE_REFERENCE,
  BEDROCK_PARTICLE_EVENT_REFERENCE,
  BEDROCK_PARTICLE_PRESET_REFERENCE,
  isBedrockParticleIdentifier,
  assertJsonValue,
  cloneJsonValue,
  createParticleDocument,
  parseParticleDocument,
  applyParticleOperations,
  serializeParticleDocument,
} from "./documentCore";
export type {
  JsonValue,
  JsonObject,
  BedrockParticlePreset,
  ParticleDiagnostic,
  ParticleMutationOperation,
  ParticleDocumentSummary,
} from "./documentCore";

import {
  inspectParticleDocument as inspectParticleDocumentCore,
  type JsonObject,
  type ParticleDiagnostic,
  type ParticleDocumentSummary,
} from "./documentCore";
import { analyzeBedrockParticleSemantics } from "./semantics";
import { analyzeBedrockParticleSchemaCoverage } from "./schemaCoverage";

function dedupeDiagnostics(
  diagnostics: readonly ParticleDiagnostic[]
): ParticleDiagnostic[] {
  const seen = new Set<string>();
  const unique: ParticleDiagnostic[] = [];
  for (const diagnostic of diagnostics) {
    const key = [
      diagnostic.severity,
      diagnostic.code,
      diagnostic.path ?? "",
      diagnostic.message,
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(diagnostic);
  }
  return unique;
}

/**
 * Canonical compact particle inspection. The lossless document core owns
 * structural/component invariants, schema coverage validates every known
 * stable Bedrock component field shape, and advanced semantics adds bounded
 * Molang/math, parametric-motion, curve, flipbook, event-fanout and cost
 * diagnostics. None of these layers evaluate gameplay truth or rewrite
 * authored expressions; unknown future fields remain preserved.
 */
export function inspectParticleDocument(
  document: JsonObject
): ParticleDocumentSummary {
  const summary = inspectParticleDocumentCore(document);
  const schema = analyzeBedrockParticleSchemaCoverage(document);
  const advanced = analyzeBedrockParticleSemantics(document);
  const diagnostics = dedupeDiagnostics([
    ...summary.diagnostics,
    ...schema,
    ...advanced,
  ]);
  if (
    diagnostics.length === summary.diagnostics.length &&
    schema.length === 0 &&
    advanced.length === 0
  ) {
    return summary;
  }
  return {
    ...summary,
    diagnostics,
  };
}

export const particleDocumentIsValid = (document: JsonObject): boolean =>
  !inspectParticleDocument(document).diagnostics.some(
    (entry) => entry.severity === "error"
  );
