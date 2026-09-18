import { z } from "zod";
import { createTool, getAllToolDefinitions, tools, withToolBranch } from "@/lib/factories";
import type { McpRegistrationFamily } from "@/lib/registrationProfile";
import {
  animationCopyPasteParameters,
  animationGraphEditorParameters,
  animationTimelineParameters,
  batchKeyframeOperationsParameters,
  manageKeyframesParameters,
} from "../tools/animation";
import {
  findElementsByCriteriaParameters,
  listOutlineParameters,
} from "../tools/element";
import { inspectElementParameters } from "../tools/element-inspection";
import {
  assignTextureChannelParameters,
  configureMaterialParameters,
  createPbrMaterialParameters,
  saveMaterialConfigParameters,
} from "../tools/texture";
import {
  bulkSetMaterialInstancesParametersSchema,
  clearMaterialInstancesParametersSchema,
  getFaceMaterialInstancesParametersSchema,
  listMaterialInstancesParametersSchema,
  setFaceMaterialInstanceParametersSchema,
} from "../tools/material-instances";
import {
  getConsolidatedExecutor,
  getConsolidatedExecutors,
  getConsolidatedFamily,
  type ConsolidatedCapability,
} from "./consolidatedRoutes";

export type ConsolidatedCatalogUpdate = (
  toolName: string,
  family: McpRegistrationFamily,
  enabled: boolean
) => void;

const consolidatedInspectionParameters = z.union([
  withToolBranch(listOutlineParameters, "mode", "outline"),
  withToolBranch(findElementsByCriteriaParameters, "mode", "search"),
  withToolBranch(inspectElementParameters, "mode", "detail"),
]);

export const consolidatedInspectionToolDocs = {
  name: "inspect_elements",
  description:
    "Inspects Bedrock elements through one focused boundary. Use mode=outline for hierarchy, search for bounded criteria discovery, or detail for one authored element with optional UV data.",
  annotations: { title: "Inspect Elements", readOnlyHint: true },
  parameters: consolidatedInspectionParameters,
  status: "stable" as const,
};

const consolidatedMaterialParameters = z.union([
  withToolBranch(createPbrMaterialParameters, "operation", "create"),
  withToolBranch(configureMaterialParameters, "operation", "configure"),
  withToolBranch(assignTextureChannelParameters, "operation", "assign_channel"),
  withToolBranch(saveMaterialConfigParameters, "operation", "save"),
]);

export const consolidatedMaterialToolDocs = {
  name: "manage_material",
  description:
    "Creates, configures, assigns channels, or saves one Bedrock PBR material through one focused boundary.",
  annotations: { title: "Manage Material", destructiveHint: true },
  parameters: consolidatedMaterialParameters,
  status: "stable" as const,
};

const consolidatedAnimationTimelineParameters = z.union([
  withToolBranch(manageKeyframesParameters, "operation", "keyframes"),
  withToolBranch(animationGraphEditorParameters, "operation", "graph"),
  withToolBranch(animationTimelineParameters, "operation", "timeline"),
  withToolBranch(batchKeyframeOperationsParameters, "operation", "batch"),
  withToolBranch(animationCopyPasteParameters, "operation", "copy_paste"),
]);

export const consolidatedAnimationTimelineToolDocs = {
  name: "manage_animation_timeline",
  description:
    "Authors one Bedrock Animation through keyframes, graph/easing, timeline, coherent batch/copy operations, or a one-call native property cohort.",
  annotations: { title: "Manage Bedrock Animation Timeline", destructiveHint: true },
  parameters: consolidatedAnimationTimelineParameters,
  status: "stable" as const,
};

const consolidatedMaterialInstancesParameters = z.union([
  withToolBranch(listMaterialInstancesParametersSchema, "operation", "list"),
  withToolBranch(getFaceMaterialInstancesParametersSchema, "operation", "get"),
  withToolBranch(setFaceMaterialInstanceParametersSchema, "operation", "set"),
  withToolBranch(bulkSetMaterialInstancesParametersSchema, "operation", "bulk_set"),
  withToolBranch(clearMaterialInstancesParametersSchema, "operation", "clear"),
]);

export const consolidatedMaterialInstancesToolDocs = {
  name: "manage_material_instances",
  description:
    "Lists, reads, assigns, bulk-assigns, or clears Bedrock face material instances through one focused boundary.",
  annotations: { title: "Manage Material Instances", destructiveHint: true },
  parameters: consolidatedMaterialInstancesParameters,
  status: "stable" as const,
};

/**
 * Retain every original executor definition in the canonical registry while
 * removing duplicate public exposure. Consolidation is routing-only: it must
 * never replace, simplify, or delete the original implementation.
 */
function retainExecutorsBehindConsolidatedSurface(
  capability: ConsolidatedCapability,
  updateCatalog: ConsolidatedCatalogUpdate
): void {
  const definitions = getAllToolDefinitions();
  const family = getConsolidatedFamily(capability);
  for (const name of getConsolidatedExecutors(capability)) {
    if (!definitions[name]) {
      throw new Error(
        `Consolidated capability ${capability} requires retained executor ${name}.`
      );
    }
    if (tools[name]) tools[name].enabled = false;
    updateCatalog(name, family, false);
  }
}

async function executeConsolidated(
  capability: ConsolidatedCapability,
  discriminatorValue: string,
  args: Record<string, unknown>
) {
  const target = getConsolidatedExecutor(capability, discriminatorValue);
  const definition = getAllToolDefinitions()[target];
  if (!definition) {
    throw new Error(
      `Consolidated capability ${capability} executor ${target} is unavailable.`
    );
  }
  return definition.execute(args);
}

function exposeConsolidatedCapability(
  capability: ConsolidatedCapability,
  updateCatalog: ConsolidatedCatalogUpdate
): void {
  updateCatalog(capability, getConsolidatedFamily(capability), true);
}

export function registerConsolidatedTools(
  updateCatalog: ConsolidatedCatalogUpdate
): void {
  if (!tools.inspect_elements) {
    createTool(
      "inspect_elements",
      {
        ...consolidatedInspectionToolDocs,
        async execute(request) {
          const { mode, ...args } = request;
          return executeConsolidated("inspect_elements", mode, args);
        },
      },
      "stable"
    );
    retainExecutorsBehindConsolidatedSurface(
      "inspect_elements",
      updateCatalog
    );
    exposeConsolidatedCapability("inspect_elements", updateCatalog);
  }

  if (!tools.manage_material) {
    createTool(
      "manage_material",
      {
        ...consolidatedMaterialToolDocs,
        async execute(request) {
          const { operation, ...args } = request;
          const result = await executeConsolidated("manage_material", operation, args);
          if (operation !== "save") return result;

          if (typeof result === "string") {
            return {
              content: [{ type: "text" as const, text: result }],
              structuredContent: {
                operation: "save",
                scope: "material_persistence_only",
              },
            };
          }

          return {
            ...result,
            structuredContent: {
              ...(result.structuredContent && typeof result.structuredContent === "object" && !Array.isArray(result.structuredContent)
                ? result.structuredContent as Record<string, unknown>
                : {}),
              operation: "save",
              scope: "material_persistence_only",
            },
          };
        },
      },
      "stable"
    );
    retainExecutorsBehindConsolidatedSurface(
      "manage_material",
      updateCatalog
    );
    exposeConsolidatedCapability("manage_material", updateCatalog);
  }

  if (!tools.manage_animation_timeline) {
    createTool(
      "manage_animation_timeline",
      {
        ...consolidatedAnimationTimelineToolDocs,
        async execute(request) {
          const operation = String(request.operation);
          const { operation: _operation, ...args } = request;
          return executeConsolidated(
            "manage_animation_timeline",
            operation,
            args
          );
        },
      },
      "stable"
    );
    retainExecutorsBehindConsolidatedSurface(
      "manage_animation_timeline",
      updateCatalog
    );
    exposeConsolidatedCapability("manage_animation_timeline", updateCatalog);
  }

  if (!tools.manage_material_instances) {
    createTool(
      "manage_material_instances",
      {
        ...consolidatedMaterialInstancesToolDocs,
        async execute(request) {
          const { operation, ...args } = request;
          return executeConsolidated(
            "manage_material_instances",
            operation,
            args
          );
        },
      },
      "stable"
    );
    retainExecutorsBehindConsolidatedSurface(
      "manage_material_instances",
      updateCatalog
    );
    exposeConsolidatedCapability("manage_material_instances", updateCatalog);
  }
}
