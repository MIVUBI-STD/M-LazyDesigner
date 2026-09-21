export type CapabilitySchemaBranch = {
  field: string;
  value: string;
};

type JsonRecord = Record<string, unknown>;
type CapabilityProjection = Record<string, Record<string, readonly string[]>>;

/**
 * Branch metadata is declarative and kept at the stable Gateway boundary.
 * Runtime validation remains authoritative; this map only removes unrelated
 * fields from describe_capability responses so the AI client does not pay for
 * every branch of a consolidated capability when it already knows the branch.
 */
const CAPABILITY_BRANCH_FIELDS: Record<string, CapabilityProjection> = {
  manage_uv_layout: {
    operation: {
      plan: [
        "operation",
        "bitmap_width",
        "bitmap_height",
        "mode",
        "island_ids",
        "default_target_pixels_per_model_unit",
        "constraints",
        "include_implicit_stack_candidates",
      ],
      apply: [
        "operation",
        "plan_id",
        "expected_source_fingerprint",
      ],
    },
  },
  manage_cubes: {
    operation: {
      create: ["operation"],
      update: ["operation"],
      batch_update: ["operation"],
      simplify: ["operation"],
    },
  },
  manage_render_profile: {
    operation: {
      inspect: ["operation"],
      bind: ["operation"],
      set_slot: ["operation"],
      assign: ["operation"],
      unassign: ["operation"],
    },
  },
  inspect_elements: {
    mode: {
      outline: ["mode", "include_cubes", "max_depth", "max_nodes"],
      search: [
        "mode",
        "name_pattern",
        "name_contains",
        "type",
        "parent_group",
        "min_size",
        "max_size",
        "selected_only",
        "limit",
      ],
      detail: ["mode", "id", "detail"],
    },
  },
  create_texture: {
    type: {
      blank: [
        "type", "name", "width", "height", "data", "group", "fill_color",
        "layer_name", "pbr_channel", "render_mode", "render_sides",
      ],
      template: [
        "type", "name", "texture_id", "width", "height", "pixel_density",
        "rearrange_uv", "power_of_two", "keep_multi_texture_occupancy",
        "padding", "group", "fill_color", "layer_name", "pbr_channel",
        "render_mode", "render_sides",
      ],
      variant: ["type", "name", "source_texture_id", "group"],
    },
  },
  manage_material: {
    operation: {
      create: ["operation", "name", "color_texture", "normal_texture", "height_texture", "mer_texture", "color_value", "mer_value", "subsurface_value"],
      configure: ["operation", "material", "color_texture", "normal_texture", "height_texture", "mer_texture", "color_value", "mer_value", "subsurface_value"],
      assign_channel: ["operation", "material", "texture", "channel"],
      save: ["operation", "material"],
    },
  },
  manage_material_instances: {
    operation: {
      list: ["operation", "include_usages", "usage_limit_per_instance"],
      get: ["operation", "cube_id", "faces"],
      set: ["operation", "cube_id", "material_name", "faces"],
      bulk_set: ["operation", "assignments"],
      clear: ["operation", "cube_id", "faces", "all_cubes"],
    },
  },
  manage_animation_timeline: {
    operation: {
      keyframes: ["operation", "animation_id", "action", "bone_name", "channel", "keyframes"],
      graph: ["operation", "animation_id", "bone_name", "channel", "axis", "action", "keyframe_range", "custom_curve"],
      timeline: ["operation", "animation_id", "action", "time", "length", "fps", "loop_mode", "range", "molang", "easing", "bone_ids"],
      batch: ["operation", "animation_id", "batch_operation", "selection", "range", "pattern", "parameters"],
      copy_paste: ["operation", "action", "source", "target"],
      properties: ["operation", "animation_id", "length", "fps", "loop_mode", "anim_time_update", "blend_weight", "start_delay", "loop_delay", "override_previous_animation", "rotation_spaces"],
    },
  },
  manage_animation_controller: {
    resource_kind: {
      client_entity: ["resource_kind", "resource_source", "resource_output", "resource_operations", "max_content_length"],
      animation_controller: ["resource_kind", "resource_source", "resource_output", "resource_controller", "resource_operations", "max_content_length"],
    },
  },
};

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
  const capabilityProjection = CAPABILITY_BRANCH_FIELDS[capability];
  const branchProjection = capabilityProjection?.[branch.field]?.[branch.value];
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
  return CAPABILITY_BRANCH_FIELDS[capability]?.[branch.field]?.[branch.value] ?? null;
}


export function listCapabilitySchemaBranches(
  capability: string
): CapabilitySchemaBranch[] {
  const projection = CAPABILITY_BRANCH_FIELDS[capability];
  if (!projection) return [];
  const branches: CapabilitySchemaBranch[] = [];
  for (const [field, values] of Object.entries(projection)) {
    for (const value of Object.keys(values)) {
      branches.push({ field, value });
    }
  }
  return branches;
}
