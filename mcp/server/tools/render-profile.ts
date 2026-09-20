/// <reference types="blockbench-types" />
import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import { isAbsoluteFilesystemPath } from "@/lib/util";
import {
  parseClientEntityDocument,
  serializeClientEntityDocument,
} from "@/lib/bedrockParticleBinding";
import {
  applyClientEntityRenderProfile,
  applyRenderControllerMaterialAssignment,
  bindEntityRenderProfile,
  inspectEntityRenderProfileBindings,
  parseRenderControllerDocument,
  removeRenderControllerMaterialAssignment,
  serializeRenderControllerDocument,
} from "@/lib/bedrockEntityRenderProfileBinding";
import { ENTITY_RENDER_PROFILE_NAMES } from "@/lib/textureRenderProfile";

const jsonPathSchema = z
  .string()
  .refine(isAbsoluteFilesystemPath, { message: "Path must be absolute." })
  .refine((value) => value.toLowerCase().endsWith(".json"), {
    message: "Render-profile resources must use .json files.",
  });

const sourceSchema = z
  .object({
    path: jsonPathSchema.optional(),
    content: z.string().min(2).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if ((value.path === undefined) === (value.content === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide exactly one source path or inline content.",
      });
    }
  });

const outputSchema = z
  .object({
    path: jsonPathSchema,
    overwrite: z.boolean().optional().default(false),
  })
  .strict();

const slotSchema = z
  .string()
  .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Material slot must be a simple identifier.");
const controllerSchema = z
  .string()
  .regex(/^controller\.render\.[^\s]+$/, "Expected controller.render.* identifier.");
const bonePatternSchema = z.string().min(1).max(128);
const profileSchema = z.enum(ENTITY_RENDER_PROFILE_NAMES);
const maxContentSchema = z.number().int().min(0).max(2_000_000).optional();

const inspectSchema = z
  .object({
    operation: z.literal("inspect"),
    client_entity_source: sourceSchema,
    render_controller_source: sourceSchema.optional(),
    render_controller: controllerSchema.optional(),
    max_content_length: maxContentSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if ((value.render_controller_source === undefined) !== (value.render_controller === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Inspect requires render_controller_source and render_controller together.",
      });
    }
  });

const bindSchema = z
  .object({
    operation: z.literal("bind"),
    client_entity_source: sourceSchema,
    render_controller_source: sourceSchema,
    client_entity_output: outputSchema.optional(),
    render_controller_output: outputSchema.optional(),
    slot: slotSchema,
    render_profile: profileSchema,
    minecraft_material_code: z.string().min(1).optional(),
    render_controller: controllerSchema,
    bone_pattern: bonePatternSchema,
    max_content_length: maxContentSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.render_profile === "custom" && !value.minecraft_material_code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minecraft_material_code"],
        message: "custom render_profile requires minecraft_material_code.",
      });
    }
    if (value.render_profile !== "custom" && value.minecraft_material_code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minecraft_material_code"],
        message: "Vanilla render profiles derive their Minecraft material code automatically.",
      });
    }
  });

const assignSchema = z
  .object({
    operation: z.literal("assign"),
    render_controller_source: sourceSchema,
    render_controller_output: outputSchema.optional(),
    render_controller: controllerSchema,
    bone_pattern: bonePatternSchema,
    slot: slotSchema,
    max_content_length: maxContentSchema,
  })
  .strict();

const unassignSchema = z
  .object({
    operation: z.literal("unassign"),
    render_controller_source: sourceSchema,
    render_controller_output: outputSchema.optional(),
    render_controller: controllerSchema,
    bone_pattern: bonePatternSchema,
    max_content_length: maxContentSchema,
  })
  .strict();

const setSlotSchema = z
  .object({
    operation: z.literal("set_slot"),
    client_entity_source: sourceSchema,
    client_entity_output: outputSchema.optional(),
    slot: slotSchema,
    render_profile: profileSchema,
    minecraft_material_code: z.string().min(1).optional(),
    max_content_length: maxContentSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.render_profile === "custom" && !value.minecraft_material_code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minecraft_material_code"],
        message: "custom render_profile requires minecraft_material_code.",
      });
    }
    if (value.render_profile !== "custom" && value.minecraft_material_code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minecraft_material_code"],
        message: "Vanilla render profiles derive minecraft_material_code automatically.",
      });
    }
  });

export const manageRenderProfileParameters = z.union([
  inspectSchema,
  bindSchema,
  setSlotSchema,
  assignSchema,
  unassignSchema,
]);

export const renderProfileToolDocs: ToolSpec = {
  name: "manage_render_profile",
  description:
    "Inspects or authors Minecraft Entity render_profile bindings across client_entity material slots and ordered render-controller bone assignments. This is separate from PBR manage_material and geometry material instances.",
  annotations: {
    title: "Manage Render Profile",
    destructiveHint: true,
    openWorldHint: true,
  },
  parameters: manageRenderProfileParameters,
  status: "stable",
};

type Fs = {
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding: "utf8"): string;
  writeFileSync(path: string, data: string): void;
  statSync(path: string): { isFile(): boolean; size: number };
  renameSync(from: string, to: string): void;
  unlinkSync(path: string): void;
};

type ResourceSource = z.infer<typeof sourceSchema>;
type ResourceOutput = z.infer<typeof outputSchema>;
type WriteIntent = {
  key: "client_entity" | "render_controller";
  path: string;
  content: string;
  allowReplace: boolean;
};
type StagedWrite = WriteIntent & {
  existed: boolean;
  byteLength: number;
  temp: string;
  backup: string;
  backedUp: boolean;
  committed: boolean;
};

function fsAccess(reason: string): Fs {
  // @ts-ignore Blockbench desktop runtime owner
  const fs = requireNativeModule("fs", { message: reason }) as Fs | undefined;
  if (!fs) {
    throw new Error(
      "File system access denied. Use inline content and omit outputs for compile-only work."
    );
  }
  return fs;
}

function readSource(source: ResourceSource) {
  if (source.content !== undefined) {
    return { content: source.content, path: null as string | null };
  }
  const fs = fsAccess(`BlockIT requested read access to ${source.path}`);
  if (!fs.existsSync(source.path!)) {
    throw new Error(`Render-profile resource does not exist: ${source.path}`);
  }
  return { content: fs.readFileSync(source.path!, "utf8"), path: source.path! };
}

function normalizePath(path: string): string {
  let value = path.replace(/\\/g, "/").replace(/\/{2,}/g, "/").replace(/\/$/, "");
  if (/^[A-Za-z]:\//.test(value) || path.startsWith("\\\\")) value = value.toLowerCase();
  return value;
}

function outputDecision(sourcePath: string | null, output?: ResourceOutput) {
  const path = output?.path ?? sourcePath;
  if (!path) return null;
  return {
    path,
    explicit: output !== undefined,
    allowReplace:
      output?.overwrite === true ||
      (sourcePath !== null && normalizePath(sourcePath) === normalizePath(path)),
  };
}

function allocateSiblingPath(
  fs: Fs,
  target: string,
  kind: "tmp" | "bak"
): string {
  for (let index = 0; index < 64; index += 1) {
    const candidate = `${target}.blockit-render-${kind}-${process.pid}-${index}`;
    if (!fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Could not allocate bounded ${kind} file for ${target}.`);
}

function stageWrite(fs: Fs, intent: WriteIntent): StagedWrite {
  const existed = fs.existsSync(intent.path);
  if (existed && !intent.allowReplace) {
    throw new Error(`Refusing to replace ${intent.path} without overwrite=true.`);
  }
  const byteLength = Buffer.byteLength(intent.content, "utf8");
  const temp = allocateSiblingPath(fs, intent.path, "tmp");
  const backup = existed ? allocateSiblingPath(fs, intent.path, "bak") : "";
  fs.writeFileSync(temp, intent.content);
  const staged = fs.statSync(temp);
  if (!staged.isFile() || staged.size !== byteLength) {
    try {
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
    } catch {}
    throw new Error(`Temporary render resource write verification failed for ${intent.path}.`);
  }
  return {
    ...intent,
    existed,
    byteLength,
    temp,
    backup,
    backedUp: false,
    committed: false,
  };
}

function rollbackStagedWrites(fs: Fs, writes: readonly StagedWrite[]): void {
  for (const write of [...writes].reverse()) {
    try {
      if (write.committed && fs.existsSync(write.path)) fs.unlinkSync(write.path);
      if (fs.existsSync(write.temp)) fs.unlinkSync(write.temp);
      if (write.backedUp && write.backup && fs.existsSync(write.backup)) {
        fs.renameSync(write.backup, write.path);
      }
    } catch {}
  }
}

export function writeRenderResourceBatchAtomic(intents: readonly WriteIntent[]) {
  if (!intents.length) return [];
  const normalized = new Set<string>();
  for (const intent of intents) {
    const key = normalizePath(intent.path);
    if (normalized.has(key)) {
      throw new Error("Render-profile batch outputs must use distinct files.");
    }
    normalized.add(key);
  }

  const fs = fsAccess(
    `BlockIT requested transactional render-profile write access to ${intents.map((item) => item.path).join(", ")}`
  );
  const writes: StagedWrite[] = [];
  try {
    // Stage and verify every output before any target file is moved.
    for (const intent of intents) writes.push(stageWrite(fs, intent));

    // Preserve every existing target before committing the first replacement.
    for (const write of writes) {
      if (!write.existed) continue;
      fs.renameSync(write.path, write.backup);
      write.backedUp = true;
    }

    // Commit every staged file, then verify the entire set.
    for (const write of writes) {
      fs.renameSync(write.temp, write.path);
      write.committed = true;
    }
    for (const write of writes) {
      const final = fs.statSync(write.path);
      if (!final.isFile() || final.size !== write.byteLength) {
        throw new Error(`Committed render resource write verification failed for ${write.path}.`);
      }
    }
  } catch (error) {
    rollbackStagedWrites(fs, writes);
    throw error;
  }

  for (const write of writes) {
    try {
      if (write.backup && fs.existsSync(write.backup)) fs.unlinkSync(write.backup);
    } catch {}
  }

  return writes.map((write) => ({
    key: write.key,
    path: write.path,
    byte_length: write.byteLength,
    replaced_existing: write.existed,
    transaction: intents.length > 1 ? ("paired_atomic" as const) : ("single_atomic" as const),
  }));
}

function writeAtomic(
  key: WriteIntent["key"],
  path: string,
  content: string,
  allowReplace: boolean
) {
  return writeRenderResourceBatchAtomic([
    { key, path, content, allowReplace },
  ])[0];
}

function bounded(content: string, max: number) {
  if (max === 0) return { content: null, truncated: false };
  return content.length > max
    ? { content: content.slice(0, max), truncated: true }
    : { content, truncated: false };
}

function defaultContentLimit(hasWrite: boolean, requested?: number): number {
  return requested ?? (hasWrite ? 0 : 100_000);
}

export function registerRenderProfileTools(): void {
  createTool(
    renderProfileToolDocs.name,
    {
      ...renderProfileToolDocs,
      parameters: manageRenderProfileParameters,
      async execute(request) {
        if (request.operation === "inspect") {
          const client = readSource(request.client_entity_source);
          const clientDoc = parseClientEntityDocument(client.content);
          let renderDoc;
          if (request.render_controller_source) {
            renderDoc = parseRenderControllerDocument(
              readSource(request.render_controller_source).content
            );
          }
          const summary = inspectEntityRenderProfileBindings(
            clientDoc,
            renderDoc,
            request.render_controller
          );
          return {
            content: [
              {
                type: "text" as const,
                text: `Inspected ${summary.slots.length} client-entity render material slot(s) and ${summary.assignments.length} ordered assignment(s).`,
              },
            ],
            structuredContent: {
              execution: "read",
              action: "render_profile",
              summary,
            },
          };
        }

        if (request.operation === "bind") {
          const clientSource = readSource(request.client_entity_source);
          const controllerSource = readSource(request.render_controller_source);
          const result = bindEntityRenderProfile(
            parseClientEntityDocument(clientSource.content),
            parseRenderControllerDocument(controllerSource.content),
            request
          );
          const summary = inspectEntityRenderProfileBindings(
            result.client_entity,
            result.render_controller,
            request.render_controller
          );
          const blocking = summary.diagnostics.filter((item) => item.severity === "error");
          if (blocking.length) {
            throw new Error(
              `Render-profile binding is invalid: ${blocking.map((item) => item.code).join(", ")}.`
            );
          }

          const clientText = serializeClientEntityDocument(result.client_entity);
          const renderText = serializeRenderControllerDocument(result.render_controller);
          const clientOutput = outputDecision(clientSource.path, request.client_entity_output);
          const renderOutput = outputDecision(controllerSource.path, request.render_controller_output);
          if (
            clientOutput &&
            renderOutput &&
            normalizePath(clientOutput.path) === normalizePath(renderOutput.path)
          ) {
            throw new Error("Client entity and render controller outputs must use different files.");
          }

          const writeIntents: WriteIntent[] = [];
          if (
            clientOutput &&
            (result.binding.changed.client_entity_slot || clientOutput.explicit)
          ) {
            writeIntents.push({
              key: "client_entity",
              path: clientOutput.path,
              content: clientText,
              allowReplace: clientOutput.allowReplace,
            });
          }
          if (
            renderOutput &&
            (result.binding.changed.render_controller_assignment || renderOutput.explicit)
          ) {
            writeIntents.push({
              key: "render_controller",
              path: renderOutput.path,
              content: renderText,
              allowReplace: renderOutput.allowReplace,
            });
          }
          const writes = writeRenderResourceBatchAtomic(writeIntents);
          const clientWrite = writes.find((item) => item.key === "client_entity") ?? null;
          const renderWrite = writes.find((item) => item.key === "render_controller") ?? null;
          const max = defaultContentLimit(writes.length > 0, request.max_content_length);

          return {
            content: [
              {
                type: "text" as const,
                text: `Bound ${request.bone_pattern} to ${result.binding.minecraft_material_code} through Material.${result.binding.slot}.`,
              },
            ],
            structuredContent: {
              execution: "applied",
              action: "render_profile",
              operation: "bind",
              binding: result.binding,
              write_transaction: {
                state: writes.length > 1 ? "paired_atomic" : writes.length === 1 ? "single_atomic" : "compile_only",
                write_count: writes.length,
              },
              client_entity_write: clientWrite,
              render_controller_write: renderWrite,
              summary,
              compiled: {
                client_entity: bounded(clientText, max),
                render_controller: bounded(renderText, max),
              },
            },
          };
        }

        if (request.operation === "set_slot") {
          const source = readSource(request.client_entity_source);
          const document = applyClientEntityRenderProfile(
            parseClientEntityDocument(source.content),
            request.slot,
            request.render_profile,
            request.minecraft_material_code
          );
          const text = serializeClientEntityDocument(document);
          const summary = inspectEntityRenderProfileBindings(document);
          const output = outputDecision(source.path, request.client_entity_output);
          const write = output
            ? writeAtomic("client_entity", output.path, text, output.allowReplace)
            : null;
          const max = defaultContentLimit(Boolean(write), request.max_content_length);
          return {
            content: [{ type: "text" as const, text: `Set client-entity render material slot ${request.slot}.` }],
            structuredContent: {
              execution: "applied",
              action: "render_profile",
              operation: "set_slot",
              slot: request.slot,
              render_profile: request.render_profile,
              minecraft_material_code:
                request.minecraft_material_code ??
                (summary.slots.find(
                  (entry) => entry.slot === request.slot
                )?.minecraft_material_code ?? null),
              write,
              summary,
              ...bounded(text, max),
            },
          };
        }

        const source = readSource(request.render_controller_source);
        const base = parseRenderControllerDocument(source.content);
        const document = request.operation === "assign"
          ? applyRenderControllerMaterialAssignment(
              base,
              request.render_controller,
              request.bone_pattern,
              request.slot
            )
          : removeRenderControllerMaterialAssignment(
              base,
              request.render_controller,
              request.bone_pattern
            );
        const text = serializeRenderControllerDocument(document);
        const output = outputDecision(source.path, request.render_controller_output);
        const write = output
          ? writeAtomic("render_controller", output.path, text, output.allowReplace)
          : null;
        const max = defaultContentLimit(Boolean(write), request.max_content_length);
        return {
          content: [
            {
              type: "text" as const,
              text:
                request.operation === "assign"
                  ? `Assigned ${request.bone_pattern} to Material.${request.slot}.`
                  : `Removed exact render material assignment for ${request.bone_pattern}.`,
            },
          ],
          structuredContent: {
            execution: "applied",
            action: "render_profile",
            operation: request.operation,
            write,
            render_controller: request.render_controller,
            bone_pattern: request.bone_pattern,
            slot: request.operation === "assign" ? request.slot : null,
            ...bounded(text, max),
          },
        };
      },
    },
    renderProfileToolDocs.status
  );
}
