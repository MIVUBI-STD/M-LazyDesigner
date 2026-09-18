/// <reference types="three" />
/// <reference types="blockbench-types" />
import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_STABLE } from "@/lib/constants";
import { readRenderedModelBounds } from "@/lib/renderedModelBounds";

export const DEFAULT_BEDROCK_UV_RESOLUTION = 128;

export const createProjectParameters = z
  .object({
    name: z.string().min(1).describe("Non-empty project name."),
    discard_unsaved: z
      .boolean()
      .optional()
      .describe(
        "Discard unsaved changes in the open project; required when it currently has unsaved work."
      ),
    resolution: z
      .union([z.literal(128), z.literal(256)])
      .optional()
      .describe("Logical UV canvas edge; 128 (default) or 256."),
  })
  .strict();

export const getProjectInfoParameters = z.object({});
export const inspectModelBoundsParameters = z.object({});

export const projectToolDocs: ToolSpec[] = [
  {
    name: "create_project",
    description:
      "Creates a new Minecraft Bedrock Entity project in Blockbench's native `bedrock` format; refuses unsaved work without `discard_unsaved`.",
    annotations: {
      title: "Create Project",
      destructiveHint: true,
      openWorldHint: true,
    },
    parameters: createProjectParameters,
    status: STATUS_STABLE,
  },
  {
    name: "get_project_info",
    description:
      "Returns project lifecycle, format, logical UV resolution, and element counts. Use inspect_elements(mode=outline) only when hierarchy detail is needed.",
    annotations: {
      title: "Get Project Info",
      readOnlyHint: true,
    },
    parameters: getProjectInfoParameters,
    status: STATUS_STABLE,
  },
  {
    name: "inspect_model_bounds",
    description:
      "Returns rendered-current-pose Cube bounds, visibility counts, and pose context. Observation only; no visual PASS/FAIL.",
    annotations: {
      title: "Inspect Model Bounds",
      readOnlyHint: true,
    },
    parameters: inspectModelBoundsParameters,
    status: STATUS_STABLE,
  },
];

function getPoseContext(): {
  animation: { uuid: string; name: string } | null;
  timeline_time: number | null;
} {
  const selectedAnimation =
    typeof AnimationItem !== "undefined" ? AnimationItem.selected : null;

  let timelineTime: number | null = null;
  if (
    selectedAnimation &&
    typeof Timeline !== "undefined" &&
    typeof Timeline.time === "number" &&
    Number.isFinite(Timeline.time)
  ) {
    timelineTime = Timeline.time;
  }

  return {
    animation: selectedAnimation
      ? { uuid: selectedAnimation.uuid, name: selectedAnimation.name }
      : null,
    timeline_time: timelineTime,
  };
}

function currentProjectLifecycle() {
  if (!Project) {
    throw new Error("No project is open.");
  }

  return {
    name: Project.name,
    uuid: Project.uuid,
    save_path: Project.save_path ?? null,
    export_path: Project.export_path ?? null,
    export_codec: Project.export_codec ?? null,
    saved: Project.saved === true,
  };
}

export function registerProjectTools() {
  createTool(projectToolDocs[0].name, {
    ...projectToolDocs[0],
    async execute({ name, discard_unsaved, resolution }) {
      if (Project && Project.saved === false && discard_unsaved !== true) {
        throw new Error(
          `The open project "${Project.name}" has unsaved changes. Save it first, or pass discard_unsaved: true to abandon them.`
        );
      }

      const created = newProject(Formats.bedrock);
      if (!created) throw new Error("Failed to create project.");

      Project!.name = name;
      Project!.texture_width = resolution ?? DEFAULT_BEDROCK_UV_RESOLUTION;
      Project!.texture_height = resolution ?? DEFAULT_BEDROCK_UV_RESOLUTION;

      const result = {
        project: currentProjectLifecycle(),
        format: { id: "bedrock" as const },
        resolution: {
          texture_width: Project!.texture_width ?? null,
          texture_height: Project!.texture_height ?? null,
        },
      };

      return {
        content: [{
          type: "text" as const,
          text: `Created Bedrock project "${result.project.name}" (${result.project.uuid}) with ${result.resolution.texture_width}×${result.resolution.texture_height} logical UV canvas.`,
        }],
        structuredContent: result,
      };
    },
  }, projectToolDocs[0].status);

  createTool(projectToolDocs[1].name, {
    ...projectToolDocs[1],
    async execute() {
      if (!Project) {
        throw new Error(
          "No project is open. Use create_project to start a new one, or open an existing file in Blockbench."
        );
      }

      const format = Format as
        | { id?: string; name?: string; display_name?: string }
        | undefined;
      const rootGroupCount = Outliner.root.reduce(
        (count, node) => count + (node instanceof Group ? 1 : 0),
        0
      );

      const result = {
        project: currentProjectLifecycle(),
        format: {
          id: format?.id ?? null,
          name: format?.display_name ?? format?.name ?? null,
        },
        resolution: {
          texture_width: Project.texture_width ?? null,
          texture_height: Project.texture_height ?? null,
        },
        counts: {
          cubes: Cube.all.length,
          groups: Group.all.length,
          textures: Texture.all.length,
          outliner_elements: Outliner.elements.length,
          root_groups: rootGroupCount,
        },
      };

      return {
        content: [{
          type: "text" as const,
          text: `Project ${result.project.name}: ${result.counts.cubes} Cubes, ${result.counts.groups} Groups, ${result.counts.textures} Textures.`,
        }],
        structuredContent: result,
      };
    },
  }, projectToolDocs[1].status);

  createTool(projectToolDocs[2].name, {
    ...projectToolDocs[2],
    async execute() {
      if (!Project) {
        throw new Error(
          "No project is open. Open or create the intended Bedrock project before inspecting model bounds."
        );
      }

      const observed = readRenderedModelBounds();
      const format = Format as { id?: string } | undefined;
      const result = {
        project: {
          uuid: Project.uuid,
          name: Project.name,
          format: format?.id ?? null,
        },
        has_geometry: observed.rendered_cube_count > 0,
        cube_count: observed.total_cube_count,
        rendered_cube_count: observed.rendered_cube_count,
        hidden_cube_count: observed.hidden_cube_count,
        bounds_basis: "rendered_current_pose" as const,
        coordinate_axes: {
          width: "x" as const,
          height: "y" as const,
          length: "z" as const,
        },
        bounds: observed.bounds,
        pose_context: getPoseContext(),
        warnings: observed.warnings,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
        structuredContent: result,
      };
    },
  }, projectToolDocs[2].status);
}
