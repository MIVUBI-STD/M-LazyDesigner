/// <reference types="three" />
/// <reference types="blockbench-types" />
import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_EXPERIMENTAL, STATUS_STABLE } from "@/lib/constants";
import { resolveCoreGroup } from "@/lib/coreIdentity";

const finiteLocatorVector3Schema = z.tuple([
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
]);
const locatorCreateSchema = z
  .object({
    action: z
      .literal("create")
      .describe("Create: requires name+parent; omit id."),
    name: z
      .string()
      .min(1)
      .describe("Required when action=create. Locator name."),
    parent: z
      .string()
      .min(1)
      .describe("Required when action=create. Parent Group UUID or unique exact name."),
    position: finiteLocatorVector3Schema
      .optional()
      .default([0, 0, 0])
      .describe("Initial position; default [0,0,0]."),
    rotation: finiteLocatorVector3Schema
      .optional()
      .default([0, 0, 0])
      .describe("Initial rotation; default [0,0,0]."),
    ignore_inherited_scale: z
      .boolean()
      .optional()
      .default(false)
      .describe("Initial ignore_inherited_scale; default false."),
  })
  .strict();

const locatorUpdateSchema = z
  .object({
    action: z
      .literal("update")
      .describe("Update: requires id + at least one authored field; omit name."),
    id: z
      .string()
      .min(1)
      .describe("Required when action=update. Locator UUID or unique exact name."),
    parent: z
      .string()
      .min(1)
      .optional()
      .describe("Replacement parent Group UUID or unique exact name."),
    position: finiteLocatorVector3Schema
      .optional()
      .describe("Replacement position."),
    rotation: finiteLocatorVector3Schema
      .optional()
      .describe("Replacement rotation."),
    ignore_inherited_scale: z
      .boolean()
      .optional()
      .describe("Replacement ignore_inherited_scale."),
  })
  .strict();

export const manageLocatorParameters = z
  .discriminatedUnion("action", [locatorCreateSchema, locatorUpdateSchema])
  .superRefine((value, ctx) => {
    if (
      value.action === "update" &&
      value.parent === undefined &&
      value.position === undefined &&
      value.rotation === undefined &&
      value.ignore_inherited_scale === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Locator update requires at least one of parent, position, rotation, or ignore_inherited_scale.",
      });
    }
  });

const nullObjectCreateSchema = z
  .object({
    action: z
      .literal("create")
      .describe("Create: requires name+parent; omit id."),
    name: z
      .string()
      .min(1)
      .describe("Required when action=create. Null Object name."),
    parent: z
      .string()
      .min(1)
      .describe("Required when action=create. Parent Group UUID or unique exact name."),
    position: finiteLocatorVector3Schema
      .optional()
      .default([0, 0, 0])
      .describe("Initial position; default [0,0,0]."),
  })
  .strict();

const nullObjectUpdateSchema = z
  .object({
    action: z
      .literal("update")
      .describe("Update: requires id plus parent and/or position; omit name."),
    id: z
      .string()
      .min(1)
      .describe("Required when action=update. Null Object UUID or unique exact name."),
    parent: z
      .string()
      .min(1)
      .optional()
      .describe("Replacement parent Group UUID or unique exact name."),
    position: finiteLocatorVector3Schema
      .optional()
      .describe("Replacement position."),
  })
  .strict();

export const manageNullObjectParameters = z
  .discriminatedUnion("action", [nullObjectCreateSchema, nullObjectUpdateSchema])
  .superRefine((value, ctx) => {
    if (
      value.action === "update" &&
      value.parent === undefined &&
      value.position === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Null Object update requires parent or position.",
      });
    }
  });

export const listLocatorElementsParameters = z.object({}).strict();

export const locatorToolDocs: ToolSpec[] = [
  {
    name: "list_locator_elements",
    description:
      "Lists Locator/Null Object identity, type, and parent. Use inspect_elements(mode=detail) for detailed authored state.",
    annotations: {
      title: "List Bedrock Locator Elements",
      readOnlyHint: true,
    },
    parameters: listLocatorElementsParameters,
    status: STATUS_STABLE,
  },
  {
    name: "manage_locator",
    description:
      "Creates or updates a Locator. Create requires name+parent; update requires id plus an authored field. For a moving attachment/reference point, parent the Locator to the animated Group/Bone; current animation tools keyframe Groups/Bones, not Locator elements directly. Rename/delete use rename_element/remove_element.",
    annotations: {
      title: "Manage Bedrock Locator",
      destructiveHint: true,
    },
    parameters: manageLocatorParameters,
    status: STATUS_EXPERIMENTAL,
  },
  {
    name: "manage_null_object",
    description:
      "Creates or updates a Null Object. Create requires name+parent; update requires id plus parent/position. Geometry uses a `_null_` locator entry; IK fields remain Blockbench editor/animation state. Rename/delete use rename_element/remove_element.",
    annotations: {
      title: "Manage Bedrock Null Object",
      destructiveHint: true,
    },
    parameters: manageNullObjectParameters,
    status: STATUS_EXPERIMENTAL,
  },
];

type LocatorElement = Locator | NullObject;
type LocatorElementKind = "locator" | "null_object";

function requireBedrockEntityProject(): void {
  if (!Project) {
    throw new Error(
      "No project is open. Open or create a Minecraft Bedrock Entity project first."
    );
  }
  const formatId = (Format as { id?: string } | undefined)?.id;
  if (formatId !== "bedrock") {
    throw new Error(
      `Locator/Null Object tools require the Minecraft Bedrock Entity format (bedrock); current format is ${formatId ?? "unknown"}.`
    );
  }
}

function parentInfo(
  element: LocatorElement
): { uuid: string; name: string } | null {
  return element.parent instanceof Group
    ? { uuid: element.parent.uuid, name: element.parent.name }
    : null;
}

function locatorSummary(locator: Locator) {
  return {
    uuid: locator.uuid,
    name: locator.name,
    type: "locator" as const,
    parent: parentInfo(locator),
  };
}

function nullObjectSummary(element: NullObject) {
  return {
    uuid: element.uuid,
    name: element.name,
    type: "null_object" as const,
    parent: parentInfo(element),
  };
}

function resolveParent(reference: string): Group {
  return resolveCoreGroup(
    reference,
    "Locator and Null Object elements must be parented to an explicit Bedrock Group/bone. Use inspect_elements(mode=outline) to confirm the Group UUID."
  );
}

function resolveLocator(reference: string): Locator {
  const uuidMatch = Locator.all.find((locator) => locator.uuid === reference);
  if (uuidMatch) return uuidMatch;

  const nameMatches = Locator.all.filter((locator) => locator.name === reference);
  if (nameMatches.length === 1) return nameMatches[0];
  if (nameMatches.length > 1) {
    throw new Error(
      `Locator name "${reference}" is ambiguous. Use an exact UUID. Candidates: ${nameMatches
        .map((locator) => `${locator.name} (${locator.uuid})`)
        .join(", ")}`
    );
  }

  throw new Error(
    `Locator "${reference}" not found. Use list_locator_elements to confirm the intended UUID.`
  );
}

function resolveNullObject(reference: string): NullObject {
  const uuidMatch = NullObject.all.find((element) => element.uuid === reference);
  if (uuidMatch) return uuidMatch;

  const nameMatches = NullObject.all.filter((element) => element.name === reference);
  if (nameMatches.length === 1) return nameMatches[0];
  if (nameMatches.length > 1) {
    throw new Error(
      `Null Object name "${reference}" is ambiguous. Use an exact UUID. Candidates: ${nameMatches
        .map((element) => `${element.name} (${element.uuid})`)
        .join(", ")}`
    );
  }

  throw new Error(
    `Null Object "${reference}" not found. Use list_locator_elements to confirm the intended UUID.`
  );
}

function updatePreview(element: LocatorElement): void {
  element.preview_controller.updateTransform(element);
  Canvas.updateAll();
}

function finiteAuthoredVector3(
  values: readonly number[],
  context: string
): [number, number, number] {
  if (values.length !== 3 || values.some((value) => !Number.isFinite(value))) {
    throw new Error(
      `${context} contains a non-finite authored transform and cannot be reported safely. Correct the project state before continuing.`
    );
  }
  return [values[0], values[1], values[2]];
}

function locatorState(locator: Locator) {
  return {
    ...locatorSummary(locator),
    position: finiteAuthoredVector3(
      locator.position,
      `Locator ${locator.name} (${locator.uuid}) position`
    ),
    rotation: finiteAuthoredVector3(
      locator.rotation,
      `Locator ${locator.name} (${locator.uuid}) rotation`
    ),
    ignore_inherited_scale: locator.ignore_inherited_scale,
    visibility: locator.visibility !== false,
  };
}

function nullObjectState(element: NullObject) {
  return {
    ...nullObjectSummary(element),
    position: finiteAuthoredVector3(
      element.position,
      `Null Object ${element.name} (${element.uuid}) position`
    ),
    ik_target: element.ik_target || null,
    ik_source: element.ik_source || null,
    lock_ik_target_rotation: element.lock_ik_target_rotation,
    visibility: element.visibility !== false,
  };
}

function mutationResult(
  state:
    | ReturnType<typeof locatorState>
    | ReturnType<typeof nullObjectState>,
  action: "create" | "update",
  changedFields: readonly string[]
) {
  const summary = {
    execution: "applied" as const,
    action,
    id: state.uuid,
    name: state.name,
    type: state.type,
    parent: state.parent,
    changed_fields: [...changedFields],
    state,
  };
  return {
    content: [
      {
        type: "text" as const,
        text: `${action === "create" ? "Created" : "Updated"} ${state.type} ${state.name} (${state.uuid}); changed: ${changedFields.join(", ") || "none"}.`,
      },
    ],
    structuredContent: summary,
  };
}

function vector3Equals(
  current: ArrayLike<number>,
  requested: ArrayLike<number>
): boolean {
  return (
    current.length === requested.length &&
    current[0] === requested[0] &&
    current[1] === requested[1] &&
    current[2] === requested[2]
  );
}

export function bedrockLocatorExportKey(
  kind: LocatorElementKind,
  name: string
): string {
  return kind === "null_object" ? `_null_${name}` : name;
}

function locatorElementKind(element: LocatorElement): LocatorElementKind {
  return element instanceof NullObject ? "null_object" : "locator";
}

function assertLocatorExportKeyAvailable(
  parent: Group,
  kind: LocatorElementKind,
  name: string,
  excludeUuid?: string
): void {
  const requestedKey = bedrockLocatorExportKey(kind, name);
  const collision = parent.children.find(
    (child) =>
      child.uuid !== excludeUuid &&
      (child instanceof Locator || child instanceof NullObject) &&
      bedrockLocatorExportKey(locatorElementKind(child), child.name) === requestedKey
  );
  if (collision instanceof Locator || collision instanceof NullObject) {
    throw new Error(
      `${kind === "locator" ? "Locator" : "Null Object"} "${name}" would export locator key "${requestedKey}" under Group "${parent.name}", but that key is already owned by ${collision instanceof NullObject ? "Null Object" : "Locator"} "${collision.name}" (${collision.uuid}). Locator keys must be unique within each parent bone.`
    );
  }
}

export function registerLocatorTools() {
  createTool(
    locatorToolDocs[0].name,
    {
      ...locatorToolDocs[0],
      async execute() {
        requireBedrockEntityProject();
        const locators = Locator.all.map(locatorSummary);
        const nullObjects = NullObject.all.map(nullObjectSummary);
        const result = {
          count: locators.length + nullObjects.length,
          locators,
          null_objects: nullObjects,
        };
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result),
            },
          ],
          structuredContent: result,
        };
      },
    },
    locatorToolDocs[0].status
  );

  createTool(
    locatorToolDocs[1].name,
    {
      ...locatorToolDocs[1],
      async execute(args) {
        requireBedrockEntityProject();

        if (args.action === "create") {
          const parent = resolveParent(args.parent);
          assertLocatorExportKeyAvailable(parent, "locator", args.name);

          const edited: OutlinerElement[] = [];
          let locator: Locator | undefined;
          Undo.initEdit({ elements: edited, outliner: true });
          try {
            locator = new Locator({
              name: args.name,
              from: [...args.position] as [number, number, number],
            });
            locator.rotation = [...args.rotation] as [number, number, number];
            locator.ignore_inherited_scale = args.ignore_inherited_scale;
            locator.addTo(parent).init();
            edited.push(locator);
            Undo.finishEdit("Add Bedrock locator");
            updatePreview(locator);
            return mutationResult(locatorState(locator), "create", [
              "name",
              "parent",
              "position",
              "rotation",
              "ignore_inherited_scale",
            ]);
          } catch (error) {
            locator?.remove();
            Undo.cancelEdit(true);
            Canvas.updateAll();
            throw error;
          }
        }

        const locator = resolveLocator(args.id);
        const nextParent =
          args.parent !== undefined ? resolveParent(args.parent) : undefined;
        const parentChanges =
          nextParent !== undefined &&
          !(
            locator.parent instanceof Group &&
            locator.parent.uuid === nextParent.uuid
          );
        const positionChanges =
          args.position !== undefined &&
          !vector3Equals(locator.position, args.position);
        const rotationChanges =
          args.rotation !== undefined &&
          !vector3Equals(locator.rotation, args.rotation);
        const scaleFlagChanges =
          args.ignore_inherited_scale !== undefined &&
          locator.ignore_inherited_scale !== args.ignore_inherited_scale;

        if (
          !parentChanges &&
          !positionChanges &&
          !rotationChanges &&
          !scaleFlagChanges
        ) {
          throw new Error(
            `No-op update rejected: locator ${locator.name} (${locator.uuid}) already has the requested state. No Undo entry was created.`
          );
        }
        if (parentChanges && nextParent) {
          assertLocatorExportKeyAvailable(
            nextParent,
            "locator",
            locator.name,
            locator.uuid
          );
        }

        Undo.initEdit({ elements: [locator], outliner: true });
        try {
          if (parentChanges && nextParent) locator.addTo(nextParent);
          if (args.position !== undefined) {
            locator.position = [...args.position] as [number, number, number];
          }
          if (args.rotation !== undefined) {
            locator.rotation = [...args.rotation] as [number, number, number];
          }
          if (args.ignore_inherited_scale !== undefined) {
            locator.ignore_inherited_scale = args.ignore_inherited_scale;
          }
          updatePreview(locator);
          Undo.finishEdit("Update Bedrock locator");
          return mutationResult(locatorState(locator), "update", [
            ...(parentChanges ? ["parent"] : []),
            ...(positionChanges ? ["position"] : []),
            ...(rotationChanges ? ["rotation"] : []),
            ...(scaleFlagChanges ? ["ignore_inherited_scale"] : []),
          ]);
        } catch (error) {
          Undo.cancelEdit(true);
          Canvas.updateAll();
          throw error;
        }
      },
    },
    locatorToolDocs[1].status
  );

  createTool(
    locatorToolDocs[2].name,
    {
      ...locatorToolDocs[2],
      async execute(args) {
        requireBedrockEntityProject();

        if (args.action === "create") {
          const parent = resolveParent(args.parent);
          assertLocatorExportKeyAvailable(parent, "null_object", args.name);
          const edited: OutlinerElement[] = [];
          let element: NullObject | undefined;
          Undo.initEdit({ elements: edited, outliner: true });
          try {
            element = new NullObject({
              name: args.name,
              position: [...args.position] as [number, number, number],
            });
            element.addTo(parent).init();
            edited.push(element);
            Undo.finishEdit("Add Bedrock null object");
            updatePreview(element);
            return mutationResult(nullObjectState(element), "create", [
              "name",
              "parent",
              "position",
            ]);
          } catch (error) {
            element?.remove();
            Undo.cancelEdit(true);
            Canvas.updateAll();
            throw error;
          }
        }

        const element = resolveNullObject(args.id);
        const nextParent =
          args.parent !== undefined ? resolveParent(args.parent) : undefined;
        const parentChanges =
          nextParent !== undefined &&
          !(
            element.parent instanceof Group &&
            element.parent.uuid === nextParent.uuid
          );
        const positionChanges =
          args.position !== undefined &&
          !vector3Equals(element.position, args.position);

        if (!parentChanges && !positionChanges) {
          throw new Error(
            `No-op update rejected: null object ${element.name} (${element.uuid}) already has the requested state. No Undo entry was created.`
          );
        }
        if (parentChanges && nextParent) {
          assertLocatorExportKeyAvailable(
            nextParent,
            "null_object",
            element.name,
            element.uuid
          );
        }

        Undo.initEdit({ elements: [element], outliner: true });
        try {
          if (parentChanges && nextParent) element.addTo(nextParent);
          if (args.position !== undefined) {
            element.position = [...args.position] as [number, number, number];
          }
          updatePreview(element);
          Undo.finishEdit("Update Bedrock null object");
          return mutationResult(nullObjectState(element), "update", [
            ...(parentChanges ? ["parent"] : []),
            ...(positionChanges ? ["position"] : []),
          ]);
        } catch (error) {
          Undo.cancelEdit(true);
          Canvas.updateAll();
          throw error;
        }
      },
    },
    locatorToolDocs[2].status
  );
}
