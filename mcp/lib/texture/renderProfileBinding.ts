import {
  cloneJsonValue,
  type JsonObject,
  type JsonValue,
} from "../jsonValue";
import {
  inspectEntityRenderMaterialCode,
  minecraftMaterialCodeForRenderProfile,
  type EntityRenderProfile,
} from "./renderProfile";

export type RenderProfileBindingDiagnostic = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  path?: string;
};

export type RenderProfileBindRequest = {
  slot: string;
  render_profile: EntityRenderProfile;
  minecraft_material_code?: string;
  render_controller: string;
  bone_pattern: string;
};

function object(value: JsonValue | undefined): JsonObject | null {
  return value !== undefined &&
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function requireSlot(value: string): string {
  const slot = value.trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(slot)) {
    throw new Error(
      `Render material slot "${value}" must use a simple identifier (letters/numbers/underscore, not starting with a number).`
    );
  }
  return slot;
}

function requireController(value: string): string {
  const controller = value.trim();
  if (!controller.startsWith("controller.render.") || /\s/.test(controller)) {
    throw new Error(
      `Render controller "${value}" must be a whitespace-free controller.render.* identifier.`
    );
  }
  return controller;
}

function requireBonePattern(value: string): string {
  const pattern = value.trim();
  if (
    !pattern ||
    pattern.length > 128 ||
    /[\u0000-\u001f\u007f]/.test(pattern)
  ) {
    throw new Error(
      "Render-controller bone pattern must be non-empty authored text without control characters (max 128 chars)."
    );
  }
  return pattern;
}

function clientDescription(document: JsonObject): JsonObject {
  const root = object(document["minecraft:client_entity"]);
  const description = root && object(root.description);
  if (!description) {
    throw new Error(
      "Client entity document must contain minecraft:client_entity.description."
    );
  }
  return description;
}

function clientMaterials(
  document: JsonObject,
  create = false
): JsonObject | null {
  const description = clientDescription(document);
  if (description.materials == null) {
    if (!create) return null;
    description.materials = {};
  }
  const materials = object(description.materials);
  if (!materials) {
    throw new Error("minecraft:client_entity.description.materials must be an object.");
  }
  return materials;
}

function renderControllers(document: JsonObject): JsonObject {
  const controllers = object(document.render_controllers);
  if (!controllers) {
    throw new Error("Render-controller document must contain render_controllers.");
  }
  return controllers;
}

function controllerDefinition(
  document: JsonObject,
  controller: string
): JsonObject {
  const id = requireController(controller);
  const definition = object(renderControllers(document)[id]);
  if (!definition) {
    throw new Error(`Render controller "${id}" does not exist.`);
  }
  return definition;
}

export function parseRenderControllerDocument(content: string): JsonObject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Render-controller JSON could not be parsed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Render-controller document root must be an object.");
  }
  const document = cloneJsonValue(parsed as JsonObject);
  renderControllers(document);
  return document;
}

export function serializeRenderControllerDocument(document: JsonObject): string {
  const safe = cloneJsonValue(document);
  renderControllers(safe);
  return `${JSON.stringify(safe, null, 2)}\n`;
}

export function applyClientEntityRenderProfile(
  source: JsonObject,
  slotInput: string,
  profile: EntityRenderProfile,
  customMaterialCode?: string
): JsonObject {
  const document = cloneJsonValue(source);
  const slot = requireSlot(slotInput);
  const materialCode = minecraftMaterialCodeForRenderProfile(
    profile,
    customMaterialCode
  );
  const materials = clientMaterials(document, true)!;
  if (materials[slot] === materialCode) {
    throw new Error(
      `Client-entity material slot "${slot}" already maps to ${materialCode}.`
    );
  }
  materials[slot] = materialCode;
  return document;
}

export function removeClientEntityRenderProfile(
  source: JsonObject,
  slotInput: string
): JsonObject {
  const document = cloneJsonValue(source);
  const slot = requireSlot(slotInput);
  const materials = clientMaterials(document, false);
  if (!materials || materials[slot] === undefined) {
    throw new Error(`Client-entity material slot "${slot}" does not exist.`);
  }
  delete materials[slot];
  if (Object.keys(materials).length === 0) {
    delete clientDescription(document).materials;
  }
  return document;
}

function materialArray(definition: JsonObject, create = false): JsonValue[] | null {
  if (definition.materials == null) {
    if (!create) return null;
    definition.materials = [];
  }
  if (!Array.isArray(definition.materials)) {
    throw new Error("render_controller.materials must be an array.");
  }
  return definition.materials;
}

function directMaterialSlot(expression: string): string | null {
  const match = /^Material\.([A-Za-z_][A-Za-z0-9_]*)$/.exec(expression.trim());
  return match?.[1] ?? null;
}

function exactMaterialAssignment(
  source: JsonObject,
  controllerInput: string,
  bonePatternInput: string
): { index: number; expression: JsonValue } | null {
  const controller = requireController(controllerInput);
  const pattern = requireBonePattern(bonePatternInput);
  const materials = materialArray(
    controllerDefinition(source, controller),
    false
  ) ?? [];
  let match: { index: number; expression: JsonValue } | null = null;
  for (let index = 0; index < materials.length; index += 1) {
    const entry = object(materials[index]);
    if (entry && Object.prototype.hasOwnProperty.call(entry, pattern)) {
      match = { index, expression: entry[pattern] };
    }
  }
  return match;
}

export function applyRenderControllerMaterialAssignment(
  source: JsonObject,
  controllerInput: string,
  bonePatternInput: string,
  slotInput: string
): JsonObject {
  const document = cloneJsonValue(source);
  const controller = requireController(controllerInput);
  const pattern = requireBonePattern(bonePatternInput);
  const slot = requireSlot(slotInput);
  const materials = materialArray(
    controllerDefinition(document, controller),
    true
  )!;
  const expression = `Material.${slot}`;
  let lastExact = -1;
  for (let index = 0; index < materials.length; index += 1) {
    const entry = object(materials[index]);
    if (entry && Object.prototype.hasOwnProperty.call(entry, pattern)) {
      lastExact = index;
    }
  }
  if (lastExact >= 0) {
    const current = object(materials[lastExact]);
    if (current?.[pattern] === expression) {
      throw new Error(
        `Render-controller assignment ${pattern} → ${expression} is already unchanged.`
      );
    }
    materials[lastExact] = { [pattern]: expression };
  } else {
    materials.push({ [pattern]: expression });
  }
  return document;
}

export function removeRenderControllerMaterialAssignment(
  source: JsonObject,
  controllerInput: string,
  bonePatternInput: string
): JsonObject {
  const document = cloneJsonValue(source);
  const controller = requireController(controllerInput);
  const pattern = requireBonePattern(bonePatternInput);
  const definition = controllerDefinition(document, controller);
  const materials = materialArray(definition, false);
  if (!materials) {
    throw new Error(`Render controller "${controller}" has no material assignments.`);
  }
  const retained = materials.filter((value) => {
    const entry = object(value);
    return !entry || !Object.prototype.hasOwnProperty.call(entry, pattern);
  });
  if (retained.length === materials.length) {
    throw new Error(
      `Render controller "${controller}" has no exact material assignment for "${pattern}".`
    );
  }
  if (retained.length) definition.materials = retained;
  else delete definition.materials;
  return document;
}

export function bindEntityRenderProfile(
  clientSource: JsonObject,
  renderControllerSource: JsonObject,
  request: RenderProfileBindRequest
) {
  const slot = requireSlot(request.slot);
  const bonePattern = requireBonePattern(request.bone_pattern);
  const controller = requireController(request.render_controller);
  const materialCode = minecraftMaterialCodeForRenderProfile(
    request.render_profile,
    request.minecraft_material_code
  );
  const currentSlot = clientMaterials(clientSource, false)?.[slot];
  const clientChanged = currentSlot !== materialCode;
  const targetExpression = `Material.${slot}`;
  const currentAssignment = exactMaterialAssignment(
    renderControllerSource,
    controller,
    bonePattern
  );
  const renderControllerChanged = currentAssignment?.expression !== targetExpression;

  if (!clientChanged && !renderControllerChanged) {
    throw new Error(
      `Render-profile binding ${bonePattern} → ${targetExpression} with ${materialCode} is already unchanged.`
    );
  }

  const client_entity = clientChanged
    ? applyClientEntityRenderProfile(
        clientSource,
        slot,
        request.render_profile,
        request.minecraft_material_code
      )
    : cloneJsonValue(clientSource);
  const render_controller = renderControllerChanged
    ? applyRenderControllerMaterialAssignment(
        renderControllerSource,
        controller,
        bonePattern,
        slot
      )
    : cloneJsonValue(renderControllerSource);

  return {
    client_entity,
    render_controller,
    binding: {
      slot,
      bone_pattern: bonePattern,
      render_controller: controller,
      changed: {
        client_entity_slot: clientChanged,
        render_controller_assignment: renderControllerChanged,
      },
      ...inspectEntityRenderMaterialCode(materialCode),
    },
  };
}

export function inspectEntityRenderProfileBindings(
  clientDocument: JsonObject,
  renderControllerDocument?: JsonObject,
  controllerInput?: string
) {
  const diagnostics: RenderProfileBindingDiagnostic[] = [];
  const slots = Object.entries(clientMaterials(clientDocument, false) ?? {})
    .map(([slot, value]) => {
      if (typeof value !== "string") {
        diagnostics.push({
          severity: "error",
          code: "NON_STRING_ENTITY_MATERIAL_SLOT",
          message: `Client-entity material slot "${slot}" must map to a string material code.`,
          path: `minecraft:client_entity.description.materials.${slot}`,
        });
        return { slot, minecraft_material_code: null, contract: null };
      }
      const contract = inspectEntityRenderMaterialCode(value);
      if (contract.verification === "unverified_custom") {
        diagnostics.push({
          severity: "warning",
          code: "CUSTOM_RENDER_MATERIAL_UNVERIFIED",
          message: `Material slot "${slot}" uses custom material "${value}"; runtime semantics remain unverified.`,
        });
      }
      return { slot, minecraft_material_code: value, contract };
    });
  const slotNames = new Set(slots.map((entry) => entry.slot));

  let assignments: Array<{
    index: number;
    bone_pattern: string;
    expression: string;
    direct_slot: string | null;
  }> = [];
  if (renderControllerDocument && controllerInput) {
    const controller = requireController(controllerInput);
    const materials = materialArray(
      controllerDefinition(renderControllerDocument, controller),
      false
    ) ?? [];
    assignments = materials.flatMap((value, index) => {
      const entry = object(value);
      if (!entry || Object.keys(entry).length !== 1) {
        diagnostics.push({
          severity: "warning",
          code: "COMPLEX_RENDER_MATERIAL_ASSIGNMENT",
          message: `Render material assignment at index ${index} is not a one-key object and is preserved without direct-slot analysis.`,
        });
        return [];
      }
      const [bonePattern, expressionValue] = Object.entries(entry)[0];
      if (typeof expressionValue !== "string") {
        diagnostics.push({
          severity: "error",
          code: "NON_STRING_RENDER_MATERIAL_EXPRESSION",
          message: `Render material assignment "${bonePattern}" must be a string/Molang material expression.`,
        });
        return [];
      }
      const directSlot = directMaterialSlot(expressionValue);
      if (directSlot && !slotNames.has(directSlot)) {
        diagnostics.push({
          severity: "error",
          code: "UNBOUND_RENDER_MATERIAL_SLOT",
          message: `Render assignment "${bonePattern}" references Material.${directSlot}, but that slot is absent from client_entity.description.materials.`,
        });
      }
      return [{
        index,
        bone_pattern: bonePattern,
        expression: expressionValue,
        direct_slot: directSlot,
      }];
    });
    const seen = new Map<string, number>();
    for (const assignment of assignments) {
      const count = (seen.get(assignment.bone_pattern) ?? 0) + 1;
      seen.set(assignment.bone_pattern, count);
      if (count > 1) {
        diagnostics.push({
          severity: "info",
          code: "REPEATED_BONE_PATTERN_ORDERED_OVERRIDE",
          message: `Bone pattern "${assignment.bone_pattern}" appears multiple times; Bedrock applies matching material entries in order and later entries can override earlier ones.`,
        });
      }
    }
  }

  return {
    domain: "minecraft_entity_render_material" as const,
    slots,
    render_controller: controllerInput ?? null,
    assignments,
    diagnostics,
    rules: {
      ordered_assignments: true,
      later_matching_assignment_can_override: true,
      surface_pattern_is_independent: true,
      pbr_texture_set_is_independent: true,
    },
  };
}
