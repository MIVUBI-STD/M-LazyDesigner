import {
  cloneJsonValue,
  isBedrockParticleIdentifier,
  type JsonObject,
  type JsonValue,
} from "./document";

export type ParticleBindingDiagnostic = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  path?: string;
};

export type ParticleBindingSummary = {
  entity_identifier: string | null;
  count: number;
  bindings: Array<{ shortname: string; effect: string }>;
  diagnostics: ParticleBindingDiagnostic[];
};

export type ParticleBindingOperation =
  | { op: "set"; shortname: string; effect: string }
  | { op: "remove"; shortname: string };

function object(value: JsonValue | undefined): JsonObject | null {
  return value !== undefined &&
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function text(value: JsonValue | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function clientEntity(document: JsonObject): JsonObject {
  const value = object(document["minecraft:client_entity"]);
  if (!value) {
    throw new Error(
      "Client entity document must contain a minecraft:client_entity object."
    );
  }
  return value;
}

function description(document: JsonObject): JsonObject {
  const value = object(clientEntity(document).description);
  if (!value) {
    throw new Error(
      "Client entity document must contain minecraft:client_entity.description."
    );
  }
  return value;
}

function particleBindings(document: JsonObject, create = false): JsonObject | null {
  const owner = description(document);
  const current = owner.particle_effects;
  if (current === undefined || current === null) {
    if (!create) return null;
    owner.particle_effects = {};
    return owner.particle_effects as JsonObject;
  }
  const value = object(current);
  if (!value) {
    throw new Error(
      "minecraft:client_entity.description.particle_effects must be an object."
    );
  }
  return value;
}

export function isParticleEffectShortname(value: string): boolean {
  return value.trim() === value &&
    value.length > 0 &&
    value.length <= 128 &&
    !/[\u0000-\u001f\u007f]/.test(value) &&
    !/\s/.test(value);
}

export function parseClientEntityDocument(content: string): JsonObject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Client entity JSON could not be parsed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Client entity document root must be an object.");
  }
  // The particle document clone owner also verifies values remain JSON-safe.
  const document = cloneJsonValue(parsed as JsonObject);
  clientEntity(document);
  description(document);
  return document;
}

export function serializeClientEntityDocument(document: JsonObject): string {
  // cloneJsonValue owns JSON-safe validation for this document family.
  const safe = cloneJsonValue(document);
  clientEntity(safe);
  description(safe);
  return `${JSON.stringify(safe, null, 2)}\n`;
}

export function inspectParticleBindings(document: JsonObject): ParticleBindingSummary {
  const diagnostics: ParticleBindingDiagnostic[] = [];
  const owner = description(document);
  const entityIdentifier = text(owner.identifier);
  const raw = particleBindings(document, false);
  const bindings: Array<{ shortname: string; effect: string }> = [];

  if (!entityIdentifier) {
    diagnostics.push({
      severity: "warning",
      code: "missing_client_entity_identifier",
      message: "Client entity description has no string identifier.",
      path: "minecraft:client_entity.description.identifier",
    });
  }

  if (raw) {
    for (const [shortname, rawEffect] of Object.entries(raw)) {
      const effect = text(rawEffect);
      if (!isParticleEffectShortname(shortname)) {
        diagnostics.push({
          severity: "warning",
          code: "unsafe_particle_shortname",
          message: `Particle shortname "${shortname}" contains whitespace/control characters or is empty.`,
          path: `minecraft:client_entity.description.particle_effects.${shortname}`,
        });
      }
      if (!effect) {
        diagnostics.push({
          severity: "error",
          code: "non_string_particle_binding",
          message: `Particle shortname "${shortname}" must map to a string particle identifier.`,
          path: `minecraft:client_entity.description.particle_effects.${shortname}`,
        });
        continue;
      }
      if (!isBedrockParticleIdentifier(effect)) {
        diagnostics.push({
          severity: "warning",
          code: "nonstandard_particle_identifier",
          message: `Particle mapping "${shortname}" targets nonstandard identifier "${effect}"; preserve only when intentionally targeting another/newer runtime.`,
          path: `minecraft:client_entity.description.particle_effects.${shortname}`,
        });
      }
      bindings.push({ shortname, effect });
    }
  }

  bindings.sort((left, right) => left.shortname.localeCompare(right.shortname));
  return {
    entity_identifier: entityIdentifier,
    count: bindings.length,
    bindings,
    diagnostics,
  };
}

export function applyParticleBindingOperations(
  source: JsonObject,
  operations: readonly ParticleBindingOperation[]
): JsonObject {
  const document = cloneJsonValue(source);
  const targeted = new Set<string>();

  for (const operation of operations) {
    if (!isParticleEffectShortname(operation.shortname)) {
      throw new Error(
        `Particle shortname "${operation.shortname}" must be non-empty, whitespace-free authored text (max 128 chars).`
      );
    }
    if (targeted.has(operation.shortname)) {
      throw new Error(
        `Particle shortname "${operation.shortname}" appears more than once in one batch; author one final mutation per binding.`
      );
    }
    targeted.add(operation.shortname);

    const bindings = particleBindings(document, operation.op === "set");
    if (operation.op === "set") {
      if (!isBedrockParticleIdentifier(operation.effect)) {
        throw new Error(
          `Particle effect "${operation.effect}" must use lowercase namespace:path syntax.`
        );
      }
      bindings![operation.shortname] = operation.effect;
      continue;
    }

    if (!bindings || bindings[operation.shortname] === undefined) {
      throw new Error(
        `Particle shortname "${operation.shortname}" does not exist in the client entity.`
      );
    }
    delete bindings[operation.shortname];
    if (Object.keys(bindings).length === 0) {
      delete description(document).particle_effects;
    }
  }

  return document;
}

export function validateParticleEffectReferences(
  document: JsonObject,
  references: readonly string[]
): ParticleBindingDiagnostic[] {
  const summary = inspectParticleBindings(document);
  const known = new Set(summary.bindings.map((entry) => entry.shortname));
  const diagnostics: ParticleBindingDiagnostic[] = [];
  for (const shortname of [...new Set(references)]) {
    if (!known.has(shortname)) {
      diagnostics.push({
        severity: "error",
        code: "unbound_particle_shortname",
        message: `Animation/controller particle reference "${shortname}" is not mapped in the client entity particle_effects table.`,
        path: "minecraft:client_entity.description.particle_effects",
      });
    }
  }
  return diagnostics;
}
