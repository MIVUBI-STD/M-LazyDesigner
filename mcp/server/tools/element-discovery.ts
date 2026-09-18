/// <reference types="blockbench-types" />

import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_STABLE } from "@/lib/constants";
import { requireOpenProject } from "@/lib/util";
import {
  finiteElementVector3Schema,
  cubeSize,
  elementContinuationState,
  exceedsBounds,
  getElementType,
  getParentName,
  isDescendantOf,
  resolveOptionalGroupScope,
  resolveUniqueTextureForDiscovery,
  safeCompileRegex,
  type IElementMatch,
  type IFilterByMaterialMatch,
} from "./element-shared";

export const elementTypeEnum = z.enum(["cube", "group", "any"]);

export const findElementsByCriteriaParameters = z.object({
  name_pattern: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Optional non-empty case-sensitive name regex; invalid/oversized/unsafe patterns are rejected."
    ),
  name_contains: z
    .string()
    .min(1)
    .optional()
    .describe("Optional non-empty substring to match element names. Case-insensitive."),
  type: elementTypeEnum
    .optional()
    .default("any")
    .describe("Restrict to Cube or Group results."),
  parent_group: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Optional Group UUID or unique exact name whose descendant subtree scopes results."
    ),
  min_size: finiteElementVector3Schema
    .optional()
    .describe("Optional finite minimum Cube size [x,y,z]."),
  max_size: finiteElementVector3Schema
    .optional()
    .describe("Optional finite maximum Cube size [x,y,z]."),
  selected_only: z
    .boolean()
    .optional()
    .default(false)
    .describe("Only consider currently selected Cubes/Groups."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .default(50)
    .describe(
      "Maximum results. Default 50; increase only when the search genuinely needs more."
    ),
}).superRefine((params, ctx) => {
  const minSize = params.min_size;
  const maxSize = params.max_size;
  if (minSize === undefined || maxSize === undefined) return;

  minSize.forEach((minimum, axis) => {
    if (minimum > maxSize[axis]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["max_size", axis],
        message: `max_size[${axis}] must be greater than or equal to min_size[${axis}].`,
      });
    }
  });
});

export const selectAllOfTypeParameters = z.object({
  type: z
    .enum(["cube", "group"])
    .describe("Element type to select."),
  add_to_selection: z
    .boolean()
    .optional()
    .default(false)
    .describe("If true, add to current selection. If false, replace Cube/Group selection."),
  parent_group: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Optional Group UUID/unique-name subtree scope; rejected if ambiguous before selection."
    ),
});

export const filterByMaterialParameters = z.object({
  texture: z
    .string()
    .describe(
      "Explicit texture reference for read-only Cube material discovery. UUID is preferred, then exact texture ID, then exact name only when unique. Ambiguous IDs or names are rejected."
    ),
  include_face_keys: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Include the list of cube face keys (e.g., 'north') that reference the texture."
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .default(50)
    .describe("Maximum matching Cubes to return."),
});

export const getSelectionParameters = z.object({});

export const listOutlineParameters = z.object({
  include_cubes: z
    .boolean()
    .optional()
    .default(true)
    .describe("If true, include cubes as leaves. If false, return groups only."),
  max_depth: z
    .number()
    .int()
    .min(1)
    .max(32)
    .optional()
    .default(8)
    .describe(
      "Maximum tree depth. Default 8; increase only for deeper structure."
    ),
  max_nodes: z
    .number()
    .int()
    .min(1)
    .max(5000)
    .optional()
    .default(120)
    .describe(
      "Maximum Cube/Group nodes returned. Default 120; raise explicitly when truncation matters."
    ),
});


export const elementDiscoveryToolDocs: ToolSpec[] = [
  {
      name: "list_outline",
      description:
        "Lists a bounded Cube/Group hierarchy and reports truncation.",
      annotations: {
        title: "List Outline",
        readOnlyHint: true,
      },
      parameters: listOutlineParameters,
      status: STATUS_STABLE,
    },
  {
      name: "find_elements_by_criteria",
      description:
        "Searches Cubes/Groups by identity, type, parent, size, or selection with bounded results.",
      annotations: {
        title: "Find Elements by Criteria",
        readOnlyHint: true,
      },
      parameters: findElementsByCriteriaParameters,
      status: STATUS_STABLE,
    },
  {
      name: "select_all_of_type",
      description:
        "Selects all Cubes or Groups of one type for workflows that require editor selection.",
      annotations: {
        title: "Select All of Type",
        destructiveHint: false,
      },
      parameters: selectAllOfTypeParameters,
      status: STATUS_STABLE,
    },
  {
      name: "filter_by_material",
      description:
        "Legacy raw face-material lookup. Disabled on the Bedrock Entity surface.",
      annotations: {
        title: "Filter Elements by Material",
        readOnlyHint: true,
      },
      parameters: filterByMaterialParameters,
      status: STATUS_STABLE,
    },
  {
      name: "get_selection",
      description:
        "Returns current Cube/Group selection and active Texture when editor selection matters.",
      annotations: {
        title: "Get Selection",
        readOnlyHint: true,
      },
      parameters: getSelectionParameters,
      status: STATUS_STABLE,
    }
];

export function registerListOutlineTool(): void {
  createTool(elementDiscoveryToolDocs[0].name, {
        ...elementDiscoveryToolDocs[0],
        async execute({ include_cubes, max_depth, max_nodes }) {
          interface IOutlineNode {
            name: string;
            uuid: string;
            type: "cube" | "group";
            children?: IOutlineNode[];
          }
    
          const truncated: string[] = [];
          let returnedNodes = 0;
          let nodeLimitReached = false;
    
          const nodeFor = (el: unknown, depth: number): IOutlineNode | null => {
            if (el instanceof Group) {
              if (returnedNodes >= max_nodes) {
                nodeLimitReached = true;
                return null;
              }
              returnedNodes += 1;
              const node: IOutlineNode = {
                name: el.name,
                uuid: el.uuid,
                type: "group",
                children: [],
              };
              if (depth >= max_depth) {
                truncated.push(el.name);
                delete node.children;
                return node;
              }
              for (const child of el.children ?? []) {
                const childNode = nodeFor(child, depth + 1);
                if (childNode) node.children!.push(childNode);
                if (nodeLimitReached) break;
              }
              return node;
            }
            if (el instanceof Cube) {
              if (!include_cubes) return null;
              if (returnedNodes >= max_nodes) {
                nodeLimitReached = true;
                return null;
              }
              returnedNodes += 1;
              return { name: el.name, uuid: el.uuid, type: "cube" };
            }
            return null;
          };
    
          const roots: IOutlineNode[] = [];
          for (const element of Outliner.root) {
            const node = nodeFor(element, 0);
            if (node) roots.push(node);
            if (nodeLimitReached) break;
          }
    
          const counts = {
            groups: Group.all.length,
            cubes: Cube.all.length,
          };
    
          return JSON.stringify(
            {
              counts,
              returned_nodes: returnedNodes,
              max_nodes,
              truncated_at_max_nodes: nodeLimitReached || undefined,
              truncated_at_max_depth: truncated.length ? truncated : undefined,
              roots,
            }
          );
        },
      }, elementDiscoveryToolDocs[0].status);
}

export function registerElementDiscoveryTools(): void {
  createTool(elementDiscoveryToolDocs[1].name, {
        ...elementDiscoveryToolDocs[1],
        async execute({
          name_pattern,
          name_contains,
          type,
          parent_group,
          min_size,
          max_size,
          selected_only,
          limit,
        }) {
          requireOpenProject("searching elements");
          const regex = safeCompileRegex(name_pattern);
          if (name_contains !== undefined && name_contains.length === 0) {
            throw new Error("name_contains cannot be empty; omit it only when no substring filter is intended.");
          }
          const needle = name_contains?.toLowerCase() ?? null;
          const parentScope = resolveOptionalGroupScope(parent_group);
    
          const candidates: Array<Cube | Group> = [
            ...(selected_only ? Cube.selected : Cube.all),
            ...(selected_only ? Group.all.filter((g: Group) => g.selected) : Group.all),
          ];
    
          const matches: IElementMatch[] = [];
          let truncated = false;
    
          for (const el of candidates) {
            const elType = getElementType(el);
            if (!elType) continue;
            if (type !== "any" && elType !== type) continue;
            if (regex && !regex.test(el.name)) continue;
            if (needle !== null && !el.name.toLowerCase().includes(needle)) continue;
            if (parentScope && !isDescendantOf(el, parentScope)) continue;
    
            if (el instanceof Cube && (min_size || max_size)) {
              if (exceedsBounds(cubeSize(el), min_size, max_size)) continue;
            }
    
            if (matches.length >= limit) {
              truncated = true;
              break;
            }
            matches.push({
              uuid: el.uuid,
              name: el.name,
              type: elType,
              parent: getParentName(el),
            });
          }
    
          return JSON.stringify(
            {
              count: matches.length,
              truncated,
              matches,
            }
          );
        },
      }, elementDiscoveryToolDocs[1].status);
    
      createTool(elementDiscoveryToolDocs[2].name, {
        ...elementDiscoveryToolDocs[2],
        async execute({ type, add_to_selection, parent_group }) {
          requireOpenProject("selecting elements");
          const parentScope = resolveOptionalGroupScope(parent_group);
    
          const pool: Array<Cube | Group> =
            type === "cube" ? [...Cube.all] : [...Group.all];
    
          const targets = parentScope
            ? pool.filter((el) => isDescendantOf(el, parentScope))
            : pool;
    
          if (!add_to_selection) {
            Cube.all.forEach((c: Cube) => c.selected && c.unselect?.());
            Group.all.forEach((g: Group) => {
              if (g.selected) g.selected = false;
            });
          }
    
          for (const el of targets) {
            if (el instanceof Group) {
              el.selected = true;
              continue;
            }
            el.select?.(new MouseEvent("click", { shiftKey: true }));
          }
    
          updateSelection();
          Canvas.updateAll();
    
          return JSON.stringify(
            {
              type,
              selected: targets.length,
              parent_group: parentScope?.name ?? null,
            }
          );
        },
      }, elementDiscoveryToolDocs[2].status);
    
      createTool(elementDiscoveryToolDocs[3].name, {
        ...elementDiscoveryToolDocs[3],
        async execute({ texture, include_face_keys, limit }) {
          const tex = resolveUniqueTextureForDiscovery(texture);
          const matches: IFilterByMaterialMatch[] = [];
          let truncated = false;
    
          for (const cube of Cube.all) {
            const faceKeys: string[] = [];
            for (const [key, face] of Object.entries(cube.faces ?? {})) {
              const faceTexId = (face as { texture?: unknown }).texture;
              if (faceTexId === tex.uuid || faceTexId === tex.id) {
                faceKeys.push(key);
              }
            }
            if (faceKeys.length > 0) {
              if (matches.length >= limit) {
                truncated = true;
                break;
              }
              matches.push({
                uuid: cube.uuid,
                name: cube.name,
                type: "cube",
                ...(include_face_keys ? { faces: faceKeys } : {}),
              });
            }
          }
    
          return JSON.stringify(
            {
              texture: { uuid: tex.uuid, name: tex.name },
              count: matches.length,
              truncated,
              matches,
            }
          );
        },
      }, elementDiscoveryToolDocs[3].status, false);
    
      createTool(elementDiscoveryToolDocs[4].name, {
        ...elementDiscoveryToolDocs[4],
        async execute() {
          requireOpenProject("reading the editor selection");
          const cubes = Cube.selected.map((c: Cube) => ({
            uuid: c.uuid,
            name: c.name,
            type: "cube" as const,
          }));
          const groups = Group.all
            .filter((g: Group) => g.selected)
            .map((g: Group) => ({
              uuid: g.uuid,
              name: g.name,
              type: "group" as const,
            }));
    
          const activeTexture = Texture.selected
            ? {
                uuid: Texture.selected.uuid,
                id: Texture.selected.id,
                name: Texture.selected.name,
                width: Texture.selected.width,
                height: Texture.selected.height,
              }
            : null;
    
          return JSON.stringify(
            {
              counts: {
                cubes: cubes.length,
                groups: groups.length,
              },
              cubes,
              groups,
              active_texture: activeTexture,
            }
          );
        },
      }, elementDiscoveryToolDocs[4].status);
}
