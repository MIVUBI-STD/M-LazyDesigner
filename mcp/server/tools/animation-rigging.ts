/// <reference types="blockbench-types" />

import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_EXPERIMENTAL } from "@/lib/constants";
import { vector3Schema, axisEnum } from "@/lib/zodObjects";
import {
  resolveAnimationRigGroup,
  toArrayVector3,
} from "./animation-shared";

export const boneRiggingParameters = z.object({
  action: z
    .enum([
      "create",
      "parent",
      "unparent",
      "delete",
      "rename",
      "set_pivot",
      "set_ik",
      "mirror",
    ])
    .describe("Action to perform on the bone structure."),
  bone_data: z
    .object({
      name: z
        .string()
        .min(1)
        .describe("Create: new name. Other actions: Group UUID or unique name."),
      new_name: z
        .string()
        .min(1)
        .optional()
        .describe("New name for rename."),
      parent: z
        .string()
        .optional()
        .describe("Parent Group UUID or unique name."),
      origin: vector3Schema
        .optional()
        .describe("Pivot/origin for set_pivot."),
      rotation: vector3Schema
        .optional()
        .describe(
          "Initial create rotation; omit for neutral zero rotation."
        ),
      children: z
        .array(z.string())
        .optional()
        .describe(
          "Create-only child UUIDs or unique exact names; all are preflighted."
        ),
      ik_enabled: z
        .boolean()
        .optional()
        .describe("Enable inverse kinematics for this bone."),
      ik_target: z
        .string()
        .optional()
        .describe("Existing target Group UUID or exact unique name for IK."),
      mirror_axis: axisEnum
        .optional()
        .describe("Axis required by mirror; no implicit mirror axis is assumed."),
    })
    .describe("Bone configuration data."),
}).superRefine((params, ctx) => {
  if (
    params.action === "set_ik" &&
    params.bone_data.ik_enabled === undefined &&
    params.bone_data.ik_target === undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["bone_data"],
      message:
        "set_ik requires ik_enabled and/or ik_target; an empty IK update is not a mutation."
    });
  }
});


export const boneRiggingToolDoc: ToolSpec = {
  name: "bone_rigging",
  description:
    "Advanced/compatibility rig operations. Normal hierarchy mutation uses add_group, modify_group, reparent_element, rename_element, and remove_element. Prefer bone_rigging only for IK or bone mirroring; legacy overlapping actions remain for compatibility.",
  annotations: {
    title: "Bone Rigging",
    destructiveHint: true,
  },
  parameters: boneRiggingParameters,
  status: STATUS_EXPERIMENTAL,
};

function resolveRigElement(reference: string): OutlinerElement {
  const uuidMatch = Outliner.elements.find(
    (element: OutlinerElement) => element.uuid === reference
  );
  if (uuidMatch) return uuidMatch;

  const nameMatches = Outliner.elements.filter(
    (element: OutlinerElement) => element.name === reference
  );
  if (nameMatches.length === 1) return nameMatches[0];
  if (nameMatches.length > 1) {
    throw new Error(
      `Outliner element name "${reference}" is ambiguous. Use an exact UUID. Candidates: ${nameMatches
        .map((element: OutlinerElement) => `${element.name} (${element.uuid})`)
        .join(", ")}`
    );
  }

  throw new Error(
    `Outliner element "${reference}" not found. Use inspect_elements(mode=outline) to confirm the intended child UUID.`
  );
}

export function deriveMirroredRigName(name: string): string {
  if (name.includes("left")) return name.replace("left", "right");
  if (name.includes("right")) return name.replace("right", "left");
  return `${name}_mirrored`;
}
export function hasCaseInsensitiveRigNameCollision(
  groups: readonly { uuid: string; name: string }[],
  requestedName: string,
  excludeUuid?: string
): boolean {
  const normalizedName = requestedName.toLowerCase();
  return groups.some(
    (group) =>
      group.uuid !== excludeUuid && group.name.toLowerCase() === normalizedName
  );
}
export function wouldCreateRigHierarchyCycle(
  targetUuid: string,
  candidateParentUuid: string,
  parentByUuid: ReadonlyMap<string, string | null>
): boolean {
  let currentUuid: string | null = candidateParentUuid;
  const visited = new Set<string>();

  while (currentUuid !== null) {
    if (currentUuid === targetUuid) return true;
    if (visited.has(currentUuid)) return true;
    visited.add(currentUuid);
    currentUuid = parentByUuid.get(currentUuid) ?? null;
  }

  return false;
}

export function registerBoneRiggingTool(): void {
  createTool(
    boneRiggingToolDoc.name,
    {
      ...boneRiggingToolDoc,
      parameters: boneRiggingParameters,
      async execute({ action, bone_data }) {
        let targetBone: Group | undefined;
        let parentBone: Group | "root" | undefined;
        let childElements: OutlinerElement[] = [];
        let deleteElements: OutlinerElement[] = [];
        let deleteGroups: Group[] = [];
        let deleteAnimations: _Animation[] = [];
        let ikTarget: Group | undefined;
        let mirroredBoneName: string | undefined;
        const boneIdentity = (group: Group) => ({
          uuid: group.uuid,
          name: group.name,
          parent: group.parent instanceof Group ? group.parent.uuid : "root",
        });
        const boneState = (group: Group) => ({
          ...boneIdentity(group),
          origin: [...group.origin] as [number, number, number],
          rotation: [...group.rotation] as [number, number, number],
          ik_enabled: group.ik_enabled === true,
          ik_target:
            (group as Group & { ik_target?: string }).ik_target ?? null,
        });
  
        switch (action) {
          case "create":
            if (hasCaseInsensitiveRigNameCollision(Group.all, bone_data.name)) {
              throw new Error(
                `Bone name "${bone_data.name}" collides case-insensitively with an existing Group. Bedrock animation matching is case-insensitive; use a distinct bone name.`
              );
            }
            parentBone = bone_data.parent
              ? resolveAnimationRigGroup(bone_data.parent)
              : "root";
            childElements = (bone_data.children ?? []).map(resolveRigElement);
            if (
              new Set(childElements.map((element) => element.uuid)).size !==
              childElements.length
            ) {
              throw new Error("children contains the same Outliner element more than once.");
            }
            if (parentBone instanceof Group) {
              const createParentBone = parentBone;
              const createParentByUuid = new Map<string, string | null>(
                Group.all.map((group: Group) =>
                  [
                    group.uuid,
                    group.parent instanceof Group ? group.parent.uuid : null,
                  ] as [string, string | null]
                )
              );
              childElements.forEach((child) => {
                if (
                  child instanceof Group &&
                  wouldCreateRigHierarchyCycle(
                    child.uuid,
                    createParentBone.uuid,
                    createParentByUuid
                  )
                ) {
                  throw new Error(
                    `Cannot create bone "${bone_data.name}" under "${createParentBone.name}" while adopting child Group "${child.name}" because that child is the parent itself, an ancestor of the parent, or the parent chain is already cyclic.`
                  );
                }
              });
            }
            if (bone_data.ik_enabled) {
              if (!bone_data.ik_target) {
                throw new Error(
                  "ik_target is required when creating a bone with ik_enabled=true."
                );
              }
              ikTarget = resolveAnimationRigGroup(bone_data.ik_target);
            }
            break;
  
          case "parent":
            targetBone = resolveAnimationRigGroup(bone_data.name);
            if (!bone_data.parent) {
              throw new Error(
                "parent is required for the parent action. Use unparent to move a bone to root."
              );
            }
            parentBone = resolveAnimationRigGroup(bone_data.parent);
            const parentByUuid = new Map<string, string | null>(
              Group.all.map((group: Group) =>
                [
                  group.uuid,
                  group.parent instanceof Group ? group.parent.uuid : null,
                ] as [string, string | null]
              )
            );
            if (
              wouldCreateRigHierarchyCycle(
                targetBone.uuid,
                parentBone.uuid,
                parentByUuid
              )
            ) {
              throw new Error(
                `Cannot parent "${targetBone.name}" under "${parentBone.name}" because the requested hierarchy would create or extend a parent cycle.`
              );
            }
            break;
  
          case "unparent":
            targetBone = resolveAnimationRigGroup(bone_data.name);
            break;
  
          case "delete": {
            targetBone = resolveAnimationRigGroup(bone_data.name);
            deleteGroups = [targetBone];
            targetBone.forEachChild((element: any) => {
              if (element instanceof Group) {
                deleteGroups.push(element);
              } else {
                deleteElements.push(element as OutlinerElement);
              }
            });
            const deleteGroupUuids = new Set(
              deleteGroups.map((group) => group.uuid)
            );
            deleteAnimations = AnimationItem.all.filter((animation) =>
              Object.keys(animation.animators ?? {}).some((animatorUuid) =>
                deleteGroupUuids.has(animatorUuid)
              )
            );
            break;
          }
  
          case "rename":
            targetBone = resolveAnimationRigGroup(bone_data.name);
            if (!bone_data.new_name) {
              throw new Error("new_name is required for the rename action.");
            }
            if (bone_data.new_name === targetBone.name) {
              throw new Error(
                `Bone "${targetBone.name}" already has that exact name; rename requires an authored name change.`
              );
            }
            if (
              hasCaseInsensitiveRigNameCollision(
                Group.all,
                bone_data.new_name,
                targetBone.uuid
              )
            ) {
              throw new Error(
                `Bone name "${bone_data.new_name}" collides case-insensitively with another Group. Bedrock animation matching is case-insensitive; choose a distinct name.`
              );
            }
            break;
  
          case "set_pivot":
            targetBone = resolveAnimationRigGroup(bone_data.name);
            if (!bone_data.origin) {
              throw new Error(
                "origin is required for set_pivot. Inspect the Group and provide the evidence-backed joint/attachment transform center explicitly."
              );
            }
            break;
  
          case "set_ik":
            targetBone = resolveAnimationRigGroup(bone_data.name);
            if (bone_data.ik_enabled === true && !bone_data.ik_target) {
              throw new Error("ik_target is required when ik_enabled=true.");
            }
            if (bone_data.ik_target) {
              ikTarget = resolveAnimationRigGroup(bone_data.ik_target);
            }
            break;
  
          case "mirror":
            targetBone = resolveAnimationRigGroup(bone_data.name);
            if (!bone_data.mirror_axis) {
              throw new Error(
                "mirror_axis is required for mirror. No implicit axis is assumed."
              );
            }
            mirroredBoneName = deriveMirroredRigName(targetBone.name);
            if (
              hasCaseInsensitiveRigNameCollision(
                Group.all,
                mirroredBoneName
              )
            ) {
              throw new Error(
                `Mirroring "${targetBone.name}" would create bone name "${mirroredBoneName}", which collides case-insensitively with an existing Group. Rename the conflicting bone or source before mirroring.`
              );
            }
            break;
        }
  
        const deletionReceipt =
          action === "delete" && targetBone
            ? {
                removed_root: boneIdentity(targetBone),
                removed_counts: {
                  groups: deleteGroups.length,
                  elements: deleteElements.length,
                  total_nodes: deleteGroups.length + deleteElements.length,
                },
                affected_animations: deleteAnimations.length,
              }
            : null;
        const undoElements = action === "delete" ? deleteElements : childElements;
        const undoGroups =
          action === "delete" ? deleteGroups : targetBone ? [targetBone] : [];
        Undo.initEdit({
          outliner: true,
          elements: undoElements,
          groups: undoGroups,
          ...(action === "delete"
            ? { selection: true, animations: deleteAnimations }
            : {}),
        });
  
        let resultText = "";
        let createdGroup: Group | undefined;
        let affectedBone: Group | undefined;
        try {
          switch (action) {
            case "create": {
              const group = new Group({
                name: bone_data.name,
                origin: bone_data.origin ? toArrayVector3(bone_data.origin) : [0, 0, 0],
                rotation: bone_data.rotation ? toArrayVector3(bone_data.rotation) : [0, 0, 0],
              }).init();
              createdGroup = group;
              affectedBone = group;
  
              group.addTo(parentBone ?? "root");
              childElements.forEach((element) => element.addTo(group));
  
              if (bone_data.ik_enabled && ikTarget) {
                group.ik_enabled = true;
                (group as Group & { ik_target?: string }).ik_target = ikTarget.uuid;
              }
  
              resultText = `Created bone "${group.name}" with UUID ${group.uuid}`;
              break;
            }
  
            case "parent": {
              targetBone!.addTo(parentBone as Group);
              affectedBone = targetBone!;
              resultText = `Parented "${targetBone!.name}" to "${(parentBone as Group).name}"`;
              break;
            }
  
            case "unparent": {
              targetBone!.addTo("root");
              affectedBone = targetBone!;
              resultText = `Unparented "${targetBone!.name}"`;
              break;
            }
  
            case "delete": {
              targetBone!.remove(false);
              // Mirror Blockbench's native Group.remove(true) Undo contract:
              // the deleted object lists represent an empty post-edit state.
              deleteElements.length = 0;
              deleteGroups.length = 0;
              resultText = `Deleted bone "${deletionReceipt!.removed_root.name}"`;
              break;
            }
  
            case "rename": {
              targetBone!.name = bone_data.new_name!;
              affectedBone = targetBone!;
              resultText = `Renamed bone to "${bone_data.new_name}"`;
              break;
            }
  
            case "set_pivot": {
              targetBone!.transferOrigin(toArrayVector3(bone_data.origin!));
              affectedBone = targetBone!;
              resultText = `Set pivot point for "${targetBone!.name}"`;
              break;
            }
  
            case "set_ik": {
              if (bone_data.ik_enabled !== undefined) {
                targetBone!.ik_enabled = bone_data.ik_enabled;
              }
              if (ikTarget) {
                (targetBone! as Group & { ik_target?: string }).ik_target = ikTarget.uuid;
              }
              affectedBone = targetBone!;
              resultText = `Updated IK settings for "${targetBone!.name}"`;
              break;
            }
  
            case "mirror": {
              const axis = bone_data.mirror_axis!;
              const mirroredBone = targetBone!.duplicate();
              createdGroup = mirroredBone;
              affectedBone = mirroredBone;
              const axisIndex = axis === "x" ? 0 : axis === "y" ? 1 : 2;
              mirroredBone.origin[axisIndex] *= -1;
              mirroredBone.name = mirroredBoneName!;
              resultText = `Mirrored bone "${targetBone!.name}" across ${axis} axis`;
              break;
            }
          }
  
          Undo.finishEdit(
            `Bone rigging: ${action}`,
            createdGroup
              ? { outliner: true, groups: [createdGroup], elements: childElements }
              : undefined
          );
        } catch (error) {
          Undo.cancelEdit(true);
          Canvas.updateAll();
          throw error;
        }
  
        Canvas.updateAll();
        if (action === "delete") {
          const result = {
            action,
            ...deletionReceipt!,
          };
          return {
            content: [{ type: "text" as const, text: resultText }],
            structuredContent: result,
          };
        }
        if (!affectedBone) {
          throw new Error(`Bone rigging action "${action}" completed without a continuation bone.`);
        }
        const result = {
          action,
          bone: boneState(affectedBone),
        };
        return {
          content: [{ type: "text" as const, text: resultText }],
          structuredContent: result,
        };
      },
    },
    boneRiggingToolDoc.status
  );
}
