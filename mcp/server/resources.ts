/// <reference types="three" />
/// <reference types="blockbench-types" />
import { createResource, resources } from "@/lib/factories";
import { findByResourceId, makeResourceUri } from "@/lib/protocol/resourceUri";

// Register projects resource using the factory pattern
createResource("projects", {
  uriTemplate: "projects://{id}",
  title: "Blockbench Projects",
  description:
    "Browse Blockbench project metadata by stable resource URI. Use focused project tools when a modelling decision needs current operational state rather than browsing context.",
  async listCallback() {
    const projects = ModelProject.all;
    if (!projects || projects.length === 0) {
      return { resources: [] };
    }
    return {
      resources: projects.map((project) => ({
        uri: makeResourceUri("projects", project, projects),
        name: project.name || project.uuid,
        description: `${project.format?.name ?? "Unknown format"} project${project.saved ? "" : " (unsaved)"}`,
        mimeType: "application/json",
      })),
    };
  },
  async readCallback(uri, { id }) {
    const projects = ModelProject.all;

    if (!projects || projects.length === 0) {
      if (id) throw new Error(`Project with ID "${id}" not found.`);
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify({ projects: [], count: 0 }),
            mimeType: "application/json",
          },
        ],
      };
    }

    // Helper to extract project info
    const getProjectInfo = (project: ModelProject) => ({
      uuid: project.uuid,
      name: project.name,
      selected: project.selected,
      saved: project.saved,
      format: project.format?.id ?? null,
      formatName: project.format?.name ?? null,
      boxUv: project.box_uv,
      textureWidth: project.texture_width,
      textureHeight: project.texture_height,
      savePath: project.save_path || null,
      exportPath: project.export_path || null,
      elementCount: project.elements?.length ?? 0,
      groupCount: project.groups?.length ?? 0,
      textureCount: project.textures?.length ?? 0,
      animationCount: project.animations?.length ?? 0,
      modelIdentifier: project.model_identifier || null,
      geometryName: project.geometry_name || null,
    });

    // If ID provided, find specific project
    if (id) {
      const project = findByResourceId(projects, id);

      if (!project) {
        throw new Error(`Project with ID "${id}" not found.`);
      }

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(getProjectInfo(project)),
            mimeType: "application/json",
          },
        ],
      };
    }

    // Return all projects
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify({
            projects: projects.map(getProjectInfo),
            count: projects.length,
            activeProject: Project ? Project.uuid : null,
          }),
          mimeType: "application/json",
        },
      ],
    };
  },
});

createResource("nodes", {
  uriTemplate: "nodes://{id}",
  title: "Blockbench Nodes",
  description:
    "Broad read-only Blockbench node observability retained for native gaps such as TextureMesh. It is not a focused authored-state owner; prefer dedicated inspection tools when available.",
  async listCallback() {
    if (!Project?.nodes_3d) {
      return { resources: [] };
    }
    const nodes = Object.values(Project.nodes_3d);
    return {
      resources: nodes.map((node) => ({
        uri: makeResourceUri("nodes", node, nodes),
        name: node.name || node.uuid,
        description: `3D node in current project`,
        mimeType: "application/json",
      })),
    };
  },
  async readCallback(uri, { id }) {
    if (!Project?.nodes_3d) {
      throw new Error("No nodes found in the Blockbench editor.");
    }

    const nodes = Object.values(Project.nodes_3d);
    const node =
      (id ? Project.nodes_3d[id] : undefined) ?? findByResourceId(nodes, id);

    if (!node) {
      throw new Error(`Node with ID "${id}" not found.`);
    }

    // Enumerate scalar fields explicitly: spreading unknown node objects can
    // pull engine/mesh references (or circular structures) into the payload.
    const nodeRecord = node as unknown as Record<string, unknown> & {
      position?: { toArray(): number[] };
      rotation?: { toArray(): number[] };
      scale?: { toArray(): number[] };
    };
    const scalar = (
      value: unknown
    ): string | number | boolean | null | undefined =>
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
        ? value
        : null;
    const extra: Record<string, string | number | boolean | null> = {};
    for (const [key, value] of Object.entries(nodeRecord)) {
      if (["position", "rotation", "scale", "uuid", "name"].includes(key)) {
        continue;
      }
      const safeValue = scalar(value);
      if (safeValue !== null && safeValue !== undefined) {
        extra[key] = safeValue;
      }
    }

    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify({
            uuid: node.uuid,
            name: node.name,
            ...extra,
            position: nodeRecord.position
              ? nodeRecord.position.toArray()
              : null,
            rotation: nodeRecord.rotation
              ? nodeRecord.rotation.toArray()
              : null,
            scale: nodeRecord.scale ? nodeRecord.scale.toArray() : null,
          }),
          mimeType: "application/json",
        },
      ],
    };
  },
});

createResource("textures", {
  uriTemplate: "textures://{id}",
  title: "Blockbench Textures",
  description:
    "Browse Texture metadata by URI. This resource does not return raw image/source payload; use `get_texture` when image data is actually needed.",
  async listCallback() {
    const textures = Project?.textures ?? [];
    if (textures.length === 0) {
      return { resources: [] };
    }
    return {
      resources: textures.map((texture) => ({
        uri: makeResourceUri("textures", texture, textures),
        name: texture.name || texture.uuid,
        mimeType: "application/json",
        description: texture.path ? `Texture from ${texture.path}` : "Embedded texture",
      })),
    };
  },
  async readCallback(uri, { id }) {
    const textures = Project?.textures ?? [];

    if (textures.length === 0) {
      if (id) throw new Error(`Texture with ID "${id}" not found.`);
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify({ textures: [], count: 0 }),
            mimeType: "application/json",
          },
        ],
      };
    }

    // Helper to extract texture info
    const getTextureInfo = (texture: Texture) => ({
      uuid: texture.uuid,
      name: texture.name,
      id: texture.id,
      width: texture.width,
      height: texture.height,
      uvWidth: texture.getUVWidth(),
      uvHeight: texture.getUVHeight(),
      frameCount: texture.frameCount,
      // @ts-ignore - ratio property exists at runtime
      ratio: texture.ratio,
      path: texture.path || null,
      folder: texture.folder || null,
      namespace: texture.namespace || null,
      particle: texture.particle ?? false,
      render_mode: texture.render_mode || "default",
      render_sides: texture.render_sides || "auto",
      visible: texture.visible ?? true,
      saved: texture.saved ?? false,
      selected: texture.selected ?? false,
      has_source: Boolean(texture.source),
    });

    // If ID provided, find specific texture
    if (id) {
      const uuidMatch = textures.find((t) => t.uuid === id);
      const idMatches = textures.filter((t) => t.id === id);
      if (!uuidMatch && idMatches.length > 1) {
        throw new Error(`Texture ID "${id}" is ambiguous; use its UUID.`);
      }
      const texture = uuidMatch ?? idMatches[0] ?? findByResourceId(textures, id);

      if (!texture) {
        throw new Error(`Texture with ID "${id}" not found.`);
      }

      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(getTextureInfo(texture)),
            mimeType: "application/json",
          },
        ],
      };
    }

    // Return all textures
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify({
            textures: textures.map(getTextureInfo),
            count: textures.length,
          }),
          mimeType: "application/json",
        },
      ],
    };
  },
});

/**
 * Conditionally registers the reference_models resource at plugin runtime.
 * The Plugins global must never be read at module scope so this module stays
 * import-safe for Bun tests and docs generation.
 */
export function registerReferenceModelsResource(): void {
  if (resources["reference_models"]) return;
  if (
    !Plugins.installed.some((p: { id: string }) => p.id === "reference_models")
  ) {
    return;
  }
  createResource("reference_models", {
    uriTemplate: "reference-models://{id}",
    title: "Reference Models",
    description:
      "Returns information about reference models in the current Blockbench project. Requires the Reference Models plugin. List URIs use the slugified name (e.g. `reference-models://turntable`) when unique, with a `~<uuid-prefix>` suffix on collision. Reads also accept the raw UUID or exact name.",
    async listCallback() {
      const elements = Outliner?.elements ?? [];
      const referenceModels = elements.filter(
        (e) => e.type === "reference_model"
      );
      if (referenceModels.length === 0) {
        return { resources: [] };
      }
      return {
        resources: referenceModels.map((model) => ({
          uri: makeResourceUri("reference-models", model, referenceModels),
          name: model.name || model.uuid,
          description: (model as { path?: string }).path
            ? `Reference model from ${(model as { path?: string }).path}`
            : "Reference model",
          mimeType: "application/json",
        })),
      };
    },
    async readCallback(uri, { id }) {
      const elements = Outliner?.elements ?? [];
      const referenceModels = elements.filter(
        (e) => e.type === "reference_model"
      );

      if (referenceModels.length === 0) {
        if (id) throw new Error(`Reference model with ID "${id}" not found.`);
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify({ referenceModels: [], count: 0 }),
              mimeType: "application/json",
            },
          ],
        };
      }

      // Normalize Vector3-like values to [number, number, number] arrays
      const normalizeVec3 = (
        value: unknown,
        defaultValue: [number, number, number]
      ): [number, number, number] => {
        if (!value) {
          return defaultValue;
        }
        if (Array.isArray(value) && value.length >= 3) {
          return [Number(value[0]), Number(value[1]), Number(value[2])];
        }
        if (
          typeof value === "object" &&
          "x" in value &&
          "y" in value &&
          "z" in value
        ) {
          const v = value as { x: number; y: number; z: number };
          return [Number(v.x), Number(v.y), Number(v.z)];
        }
        return defaultValue;
      };

      const getReferenceModelInfo = (model: OutlinerElement) => {
        const refModel = model as OutlinerElement & {
          path?: string; origin?: unknown; rotation?: unknown; scale?: unknown;
          visibility?: boolean; wireframe?: boolean; locked?: boolean; export?: boolean;
          mesh?: { children?: unknown[] };
        };
        return {
          uuid: refModel.uuid, name: refModel.name, path: refModel.path || null,
          origin: normalizeVec3(refModel.origin, [0, 0, 0]),
          rotation: normalizeVec3(refModel.rotation, [0, 0, 0]),
          scale: normalizeVec3(refModel.scale, [1, 1, 1]),
          visibility: refModel.visibility ?? true, wireframe: refModel.wireframe ?? false,
          locked: refModel.locked ?? false, export: refModel.export !== false,
          loaded: Boolean(refModel.mesh?.children?.length),
        };
      };

      // If ID provided, find specific reference model
      if (id) {
        const model = findByResourceId(referenceModels, id);

        if (!model) {
          throw new Error(`Reference model with ID "${id}" not found.`);
        }

        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify(getReferenceModelInfo(model)),
              mimeType: "application/json",
            },
          ],
        };
      }

      // Return all reference models
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify({
              referenceModels: referenceModels.map(getReferenceModelInfo),
              count: referenceModels.length,
            }),
            mimeType: "application/json",
          },
        ],
      };
    },
  });
}