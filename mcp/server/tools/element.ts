/// <reference types="blockbench-types" />

import type { ToolSpec } from "@/lib/factories";
import {
  elementMutationToolDocs,
  registerElementMutationTools,
  registerRemoveElementTool,
} from "./element-mutation";
export {
  duplicateElementParameters,
  removeElementParameters,
  renameElementParameters,
} from "./element-mutation";

import {
  elementHierarchyToolDocs,
  registerAddGroupTool,
  registerElementHierarchyTools,
} from "./element-hierarchy";
export {
  addGroupParameters,
  modifyGroupParameters,
  reparentElementParameters,
} from "./element-hierarchy";

import {
  elementDiscoveryToolDocs,
  registerElementDiscoveryTools,
  registerListOutlineTool,
} from "./element-discovery";
export {
  elementTypeEnum,
  filterByMaterialParameters,
  findElementsByCriteriaParameters,
  getSelectionParameters,
  listOutlineParameters,
  selectAllOfTypeParameters,
} from "./element-discovery";

export {
  hasCaseInsensitiveGroupNameCollision,
  requireFiniteTranslatedElementVector3,
} from "./element-shared";

export const elementToolDocs: ToolSpec[] = [
  elementMutationToolDocs[0],
  elementHierarchyToolDocs[0],
  elementDiscoveryToolDocs[0],
  elementMutationToolDocs[1],
  elementMutationToolDocs[2],
  ...elementDiscoveryToolDocs.slice(1),
  elementHierarchyToolDocs[1],
  elementHierarchyToolDocs[2],
];

export function registerElementTools(): void {
  registerRemoveElementTool();
  registerAddGroupTool();
  registerListOutlineTool();
  registerElementMutationTools();
  registerElementDiscoveryTools();
  registerElementHierarchyTools();
}
