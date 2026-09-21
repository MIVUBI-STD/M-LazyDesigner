import { manifestEntriesForCapability } from "./capabilityManifest";
export type CapabilitySchemaBranch = {
  field: string;
  value: string;
};

type JsonRecord = Record<string, unknown>;
function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// Only check explicit discriminator constraints; this is not a JSON Schema
// validator. Execution still uses the complete Runtime parameterSchema.
function excludesBranchValue(schema: JsonRecord, value: string): boolean {
  if (Object.hasOwn(schema, "const") && schema.const !== value) return true;
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) return true;
  for (const key of ["anyOf", "oneOf"] as const) {
    const variants = schema[key];
    if (Array.isArray(variants) && variants.length > 0 &&
        variants.every((variant) => isRecord(variant) && excludesBranchValue(variant, value))) {
      return true;
    }
  }
  return false;
}

function projectObjectSchema(
  schema: JsonRecord,
  branch: CapabilitySchemaBranch,
  allowedFields: readonly string[]
): JsonRecord {
  if (!isRecord(schema.properties)) {
    throw new Error("Runtime schema has no object properties; describe the full capability instead.");
  }
  const discriminator = schema.properties[branch.field];
  if (!isRecord(discriminator) || excludesBranchValue(discriminator, branch.value)) {
    throw new Error(`Runtime schema does not advertise ${branch.field}=${branch.value}; describe the full capability instead.`);
  }
  const allowed = new Set(allowedFields);
  const properties = Object.fromEntries(
    Object.entries(schema.properties).filter(([name]) => allowed.has(name))
  );
  properties[branch.field] = {
    ...discriminator,
    const: branch.value,
    enum: [branch.value],
  };
  // A selected projection must explicitly select its branch. Preserve the
  // Runtime's existing required fields, but do not invent lost branch rules.
  const required = Array.isArray(schema.required)
    ? schema.required.filter(
        (name): name is string => typeof name === "string" && allowed.has(name)
      )
    : [];
  return {
    ...schema,
    properties,
    required: [...new Set([...required, branch.field])],
  };
}

/** Select declared canonical union branches; required fields stay source-owned. */
function selectBranchSchemas(schema: JsonRecord, branch: CapabilitySchemaBranch): JsonRecord[] {
  for (const keyword of ["anyOf", "oneOf"] as const) {
    if (Array.isArray(schema[keyword])) {
      return schema[keyword].flatMap((variant) =>
        isRecord(variant) ? selectBranchSchemas(variant, branch) : []
      );
    }
  }
  if (isRecord(schema.properties)) {
    const discriminator = schema.properties[branch.field];
    if (isRecord(discriminator) && !excludesBranchValue(discriminator, branch.value)) return [schema];
  }
  return [];
}

export function projectCapabilityInputSchema(
  capability: string,
  inputSchema: unknown,
  branch?: CapabilitySchemaBranch
): {
  inputSchema: unknown;
  projected: boolean;
  branch: CapabilitySchemaBranch | null;
} {
  if (!branch) return { inputSchema, projected: false, branch: null };
  const branchProjection = manifestEntriesForCapability(capability).find(
    (entry) =>
      entry.branch?.field === branch.field &&
      entry.branch.value === branch.value
  )?.schemaFields;
  if (!branchProjection) {
    throw new Error(
      `Capability "${capability}" does not expose a describe projection for ${branch.field}=${branch.value}. Describe the full capability or use a supported branch.`
    );
  }
  if (!isRecord(inputSchema)) {
    throw new Error(
      `Capability "${capability}" returned a non-object input schema; branch projection is unavailable.`
    );
  }
  const selected = selectBranchSchemas(inputSchema, branch);
  if (selected.length === 0) {
    throw new Error(`Runtime schema does not advertise ${branch.field}=${branch.value}; describe the full capability instead.`);
  }
  const projected = selected.map((schema) => projectObjectSchema(schema, branch,
    // Canonical branches own their field set, including future nested inputs.
    Array.isArray(inputSchema.anyOf) || Array.isArray(inputSchema.oneOf)
      ? Object.keys(schema.properties as JsonRecord)
      : branchProjection));
  return {
    inputSchema: projected.length === 1 ? projected[0] : { type: "object", anyOf: projected },
    projected: true,
    branch,
  };
}

export function getCapabilityBranchFields(
  capability: string,
  branch: CapabilitySchemaBranch
): readonly string[] | null {
  return manifestEntriesForCapability(capability).find(
    (entry) =>
      entry.branch?.field === branch.field &&
      entry.branch.value === branch.value
  )?.schemaFields ?? null;
}


export function listCapabilitySchemaBranches(
  capability: string
): CapabilitySchemaBranch[] {
  return manifestEntriesForCapability(capability)
    .filter((entry) => entry.branch && entry.schemaFields)
    .map((entry) => ({
      field: entry.branch!.field,
      value: entry.branch!.value,
    }));
}
