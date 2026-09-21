export type CanonicalJsonPrimitive = string | number | boolean | null;
export type CanonicalJsonValue =
  | CanonicalJsonPrimitive
  | readonly CanonicalJsonValue[]
  | { readonly [key: string]: CanonicalJsonValue };

function canonicalize(value: unknown, path: string): CanonicalJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Non-finite number at ${path} cannot be canonical JSON.`);
    }
    return Object.is(value, -0) ? 0 : value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => canonicalize(item, `${path}[${index}]`));
  }

  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const output: Record<string, CanonicalJsonValue> = {};
    for (const key of Object.keys(source).sort()) {
      const item = source[key];
      if (item === undefined) {
        throw new TypeError(`Undefined value at ${path}.${key} cannot be canonical JSON.`);
      }
      output[key] = canonicalize(item, `${path}.${key}`);
    }
    return output;
  }

  throw new TypeError(
    `Unsupported ${typeof value} value at ${path} cannot be canonical JSON.`
  );
}

/**
 * Deterministic JSON representation for semantic fingerprints.
 *
 * Object keys are sorted recursively, array order is retained because array
 * order may be semantically meaningful, and incidental undefined/non-finite
 * values fail closed instead of silently changing identity.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value, "$"));
}
