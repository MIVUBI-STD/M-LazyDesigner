/// <reference types="blockbench-types" />

import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_EXPERIMENTAL, STATUS_STABLE } from "@/lib/constants";
import { resolveCoreCubeOrGroup, resolveCoreTexture } from "@/lib/coreIdentity";
import {
  elementIdSchema,
  textureIdSchema,
} from "@/lib/zodObjects";
import { hasExactTextureGroupNameCollision } from "./texture-materials";

export const applyTextureParameters = z.object({
  id: elementIdSchema
    .min(1)
    .describe(
      "Required Cube/Group UUID or unique exact name."
    ),
  texture: textureIdSchema
    .min(1)
    .describe(
      "Required Texture UUID, exact ID, or unique exact name."
    ),
  applyTo: z
    .enum(["all", "blank", "none"])
    .describe("Apply texture to element or group.")
    .optional()
    .default("blank"),
});


export const addTextureGroupParameters = z.object({
  name: z.string().min(1).describe("Non-empty TextureGroup name."),
  textures: z
    .array(z.string().min(1))
    .min(1)
    .optional()
    .describe(
      "Optional non-empty explicit texture targets; each resolves UUID, then texture ID, then unique name."
    ),
  is_material: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether the texture group is a PBR material or not."),
});


export const activateTextureParameters = z.object({
  texture: textureIdSchema
    .min(1)
    .describe(
      "Texture target to activate; UUID preferred, then ID, then unique name."
    ),
});


export const applyTextureToolDoc: ToolSpec = {
  name: "apply_texture",
  description:
    "Legacy per-face texture wrapper. Disabled on the normal Bedrock Entity surface; use activate_texture.",
  annotations: {
    title: "Apply Texture",
    destructiveHint: true,
  },
  parameters: applyTextureParameters,
  status: STATUS_EXPERIMENTAL,
};

export const addTextureGroupToolDoc: ToolSpec = {
  name: "add_texture_group",
  description:
    "Adds a uniquely named TextureGroup.",
  annotations: {
    title: "Add Texture Group",
    destructiveHint: true,
  },
  parameters: addTextureGroupParameters,
  status: STATUS_EXPERIMENTAL,
};

export const activateTextureToolDoc: ToolSpec = {
  name: "activate_texture",
  description:
    "Activates one texture for subsequent paint operations.",
  annotations: {
    title: "Activate Texture",
    destructiveHint: false,
    idempotentHint: true,
  },
  parameters: activateTextureParameters,
  status: STATUS_STABLE,
};

type ApplyTextureElement = Cube | Group;

function applyTextureElementType(
  element: ApplyTextureElement
): "cube" | "group" {
  return element instanceof Cube ? "cube" : "group";
}

function resolveApplyTextureElement(reference: string): ApplyTextureElement {
  return resolveCoreCubeOrGroup(
    reference,
    "Use inspect_elements(mode=outline|search) to confirm the intended Cube/Group UUID before applying a texture."
  );
}

function resolveApplyTextureTexture(reference: string): Texture {
  return resolveCoreTexture(
    reference,
    "Use list_textures to confirm the intended UUID or texture ID before applying it."
  );
}

function resolveActivateTextureTexture(reference: string): Texture {
  return resolveCoreTexture(
    reference,
    "Use list_textures to confirm the intended UUID or texture ID before activating it."
  );
}

function resolveAddTextureGroupTexture(reference: string): Texture {
  return resolveCoreTexture(
    reference,
    "Use list_textures to confirm the intended UUID or texture ID before adding the texture group."
  );
}

export function registerTextureAssignmentTools(): void {
  createTool(applyTextureToolDoc.name, {
      ...applyTextureToolDoc,
      parameters: applyTextureParameters,
      async execute({ applyTo, id, texture }) {
        const element = resolveApplyTextureElement(id);
        const projectTexture = resolveApplyTextureTexture(texture);
  
        // Resolve the target to concrete Bedrock Cube geometry.
        // Group scopes recurse through Groups and collect descendant Cubes only.
        const targets: Cube[] = [];
        if (element instanceof Group) {
          const collectDescendants = (group: Group) => {
            for (const child of group.children ?? []) {
              if (child instanceof Cube) {
                targets.push(child);
                continue;
              }
              if (child instanceof Group) collectDescendants(child);
            }
          };
          collectDescendants(element);
        } else {
          targets.push(element);
        }
  
        if (targets.length === 0) {
          throw new Error(`Element "${id}" resolved to no paintable Bedrock Cubes.`);
        }
  
        // Save prior direct selection so the call remains non-destructive to UI state.
        const prevCubeSelection = [...Cube.selected];
        const prevGroupSelection = [...Group.selected];
  
        // Undo must capture the element face-texture state, not just outliner.
        Undo.initEdit({
          elements: targets,
          outliner: false,
          collections: [],
        });
  
        try {
          try {
            // Replace selection with exactly the resolved Cube targets so Texture.apply()
            // cannot be affected by unrelated caller selection.
            Cube.all.forEach((cube: Cube) => {
              if (cube.selected) cube.unselect?.();
            });
            Group.selected.slice().forEach((group: Group) => group.unselect());
  
            for (const target of targets) {
              target.select?.(new MouseEvent("click", { shiftKey: true }));
            }
            updateSelection();
  
            projectTexture.select();
            Texture.selected?.apply(
              applyTo === "none" ? false : applyTo === "all" ? true : "blank"
            );
            projectTexture.updateChangesAfterEdit();
          } finally {
            Cube.all.forEach((cube: Cube) => {
              if (cube.selected) cube.unselect?.();
            });
            Group.selected.slice().forEach((group: Group) => group.unselect());
  
            for (const cube of prevCubeSelection) {
              cube.select?.(new MouseEvent("click", { shiftKey: true }));
            }
            for (const group of prevGroupSelection) {
              group.markAsSelected(false);
            }
            updateSelection();
          }
  
          Undo.finishEdit("Agent applied texture");
        } catch (error) {
          Undo.cancelEdit(true);
          Canvas.updateAll();
          throw error;
        }
  
        // Force face-level render refresh so the viewport matches the data.
        // Canvas.updateAll() alone sometimes doesn't push new face materials
        // into the THREE.js render targets.
        Canvas.updateView({
          elements: targets,
          element_aspects: { faces: true, uv: true, geometry: false },
        });
        Canvas.updateAll();
  
        return `Applied texture "${projectTexture.name}" to ${targets.length} Bedrock Cube(s) scoped by "${id}" (${element instanceof Group ? "group" : "cube"}).`;
      },
    }, applyTextureToolDoc.status, false);
  
    

  createTool(addTextureGroupToolDoc.name, {
      ...addTextureGroupToolDoc,
      parameters: addTextureGroupParameters,
      async execute({ name, textures, is_material }) {
        if (hasExactTextureGroupNameCollision(TextureGroup.all, name)) {
          throw new Error(`TextureGroup name "${name}" already exists. Use a distinct name so future material/group references remain deterministic.`);
        }
        const textureList = textures?.map(resolveAddTextureGroupTexture) ?? [];
        const textureGroup = new TextureGroup({
          name,
          is_material,
        });
        const originalTextureGroups = textureList.map((texture) => ({
          texture,
          group: texture.group,
        }));
  
        Undo.initEdit({
          texture_groups: [],
          textures: textureList,
        });
  
        try {
          textureList.forEach((texture) => {
            texture.group = textureGroup.uuid;
          });
  
          textureGroup.add();
  
          Undo.finishEdit("Agent added texture group", {
            texture_groups: [textureGroup],
            textures: textureList,
          });
        } catch (error) {
          for (const { texture, group } of originalTextureGroups) {
            texture.group = group;
          }
          textureGroup.remove();
          Undo.cancelEdit();
          Canvas.updateAll();
          throw error;
        }
  
        Canvas.updateAll();
  
        return `Added texture group ${textureGroup.name} with ID ${textureGroup.uuid}`;
      },
    }, addTextureGroupToolDoc.status);
  
    

}

export function registerTextureActivationTool(): void {
  createTool(activateTextureToolDoc.name, {
      ...activateTextureToolDoc,
      parameters: activateTextureParameters,
      async execute({ texture }) {
        const target = resolveActivateTextureTexture(texture);
        if (Texture.selected?.uuid !== target.uuid) {
          target.select();
        }
        return `Activated texture "${target.name}" (uuid: ${target.uuid}). Paint tools will now target it by default.`;
      },
    }, activateTextureToolDoc.status);
}
