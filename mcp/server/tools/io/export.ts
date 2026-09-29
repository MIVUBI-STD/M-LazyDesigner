/// <reference types="three" />
/// <reference types="blockbench-types" />
import { z } from "zod";
import { createTool, type ToolSpec } from "@/lib/factories";
import { STATUS_EXPERIMENTAL, STATUS_STABLE } from "@/lib/constants";
import { isAbsoluteFilesystemPath } from "@/lib/util";

export const BLOCKIT_MODEL_CODEC_IDS = ["bedrock", "project"] as const;
const blockitModelCodecEnum = z.enum(BLOCKIT_MODEL_CODEC_IDS);

export const listExportFormatsParameters = z.object({});


export const exportModelParameters = z.object({
  codec_id: blockitModelCodecEnum
    .optional()
    .default("bedrock")
    .describe(
      "BlockIT output: `bedrock` = Bedrock geometry JSON, `project` = editable `.bbmodel`."
    ),
  options: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      "Optional compile options for the selected Bedrock/project codec."
    ),
  path: z
    .string()
    .refine(isAbsoluteFilesystemPath, {
      message:
        "Export path must be absolute: use a POSIX `/...` path, a Windows drive path such as `C:\\...`, or a UNC path such as `\\\\server\\share\\...`.",
    })
    .optional()
    .describe(
      "Optional absolute output path; requires Blockbench filesystem permission."
    ),
  overwrite: z
    .boolean()
    .optional()
    .describe(
      "Allow replacing an existing `.bbmodel` at `path`; Bedrock exports always refuse existing files."
    ),
  max_content_length: z
    .number()
    .int()
    .min(0)
    .max(2_000_000)
    .optional()
    .describe(
      "Max characters returned in `content`; default 0 with `path`, else 100000."
    ),
});

export const exportToolDocs: ToolSpec[] = [
  {
    name: "list_export_formats",
    description:
      "Lists the model outputs intentionally exposed by BlockIT for an active Bedrock Entity project: native Bedrock geometry JSON (`bedrock`) and editable Blockbench project (`project`). It does not enumerate arbitrary registered Blockbench codecs. Bedrock animation files/controllers use Blockbench's separate AnimationCodec surface and are not represented as generic model codecs here.",
    annotations: {
      title: "List BlockIT Model Outputs",
      readOnlyHint: true,
    },
    parameters: listExportFormatsParameters,
    status: STATUS_STABLE,
  },
  {
    name: "export_model",
    description:
      "Compiles the active Bedrock Entity project as Bedrock geometry JSON or editable `.bbmodel` with verified filesystem writes; `overwrite` consents to replacing an existing `.bbmodel`, and existing Bedrock geometry files are always refused.",
    annotations: {
      title: "Export Bedrock Model",
      destructiveHint: true,
      openWorldHint: true,
    },
    parameters: exportModelParameters,
    status: STATUS_EXPERIMENTAL,
  },
];

type BlockITCodec = {
  id?: string;
  name?: string;
  extension?: string;
  compile?: (opts?: unknown) => unknown;
  getExportOptions?: () => Record<string, unknown>;
  fileName?: () => string;
  afterSave?: (path: string) => void;
  support_partial_export?: boolean;
};

type ExportFilesystem = {
  existsSync: (path: string) => boolean;
  readdirSync: (path: string, options: { withFileTypes: true }) => Array<{
    name: string;
    isFile: () => boolean;
    isSymbolicLink: () => boolean;
  }>;
  writeFileSync: (
    path: string,
    data: string | Buffer,
    options?: { flag?: "w" | "wx" }
  ) => void;
  statSync: (path: string) => {
    isFile: () => boolean;
    size: number;
  };
};

function requireBedrockEntityProject(): void {
  if (!Project) {
    throw new Error(
      "No project is open. Use `create_project` or open a Minecraft Bedrock Entity project first."
    );
  }

  const formatId = (Format as { id?: string } | undefined)?.id;
  if (formatId !== "bedrock") {
    throw new Error(
      `BlockIT model export requires the Minecraft Bedrock Entity format (bedrock); current format is ${formatId ?? "unknown"}.`
    );
  }
}


function currentExportProjectLifecycle() {
  return {
    name: Project!.name,
    uuid: Project!.uuid,
    save_path: Project!.save_path ?? null,
    export_path: Project!.export_path ?? null,
    export_codec: Project!.export_codec ?? null,
    saved: Project!.saved === true,
  };
}

function codecRegistry(): Record<string, BlockITCodec> {
  // @ts-ignore - Codecs is a Blockbench global registry.
  return Codecs as Record<string, BlockITCodec>;
}


function filesystemFileName(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

function filesystemStem(path: string): string {
  return filesystemFileName(path).replace(/\.[^.]+$/, "");
}

function toTextContent(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "string") return raw;
  if (raw instanceof ArrayBuffer) return `[binary: ${raw.byteLength} bytes]`;
  if (typeof raw === "object") {
    try {
      return JSON.stringify(raw, null, 2);
    } catch {
      return String(raw);
    }
  }
  return String(raw);
}

function sliceWithoutSplittingSurrogatePair(
  value: string,
  maxChars: number
): string {
  let end = maxChars;
  const lastCodeUnit = value.charCodeAt(end - 1);
  if (lastCodeUnit >= 0xd800 && lastCodeUnit <= 0xdbff) {
    end -= 1;
  }
  return value.slice(0, end);
}

export function registerExportTools() {
  createTool(
    exportToolDocs[0].name,
    {
      ...exportToolDocs[0],
      async execute() {
        requireBedrockEntityProject();
        const registry = codecRegistry();
        const codecs = BLOCKIT_MODEL_CODEC_IDS.map((id) => {
          const codec = registry[id];
          return {
            id,
            name: codec?.name ?? id,
            extension: codec?.extension ?? (id === "project" ? "bbmodel" : "json"),
            available: !!codec,
            has_compile: typeof codec?.compile === "function",
            supports_partial_export: Boolean(codec?.support_partial_export),
            purpose: id === "bedrock" ? "bedrock_geometry" : "editable_blockbench_project",
          };
        });

        return JSON.stringify({
          current_format: "bedrock",
          count: codecs.length,
          codecs,
          note:
            "Bedrock animation/controller files are owned by Blockbench's separate AnimationCodec and are not arbitrary model codec exports.",
        });
      },
    },
    exportToolDocs[0].status,
    false
  );

  createTool(
    exportToolDocs[1].name,
    {
      ...exportToolDocs[1],
      async execute({ codec_id, options, path, overwrite, max_content_length }) {
        requireBedrockEntityProject();
        const registry = codecRegistry();
        const codec = registry[codec_id];

        if (!codec) {
          throw new Error(
            `Required BlockIT codec "${codec_id}" is not registered in this Blockbench build.`
          );
        }
        if (typeof codec.compile !== "function") {
          throw new Error(
            `BlockIT codec "${codec_id}" does not support programmatic compile().`
          );
        }

        let exportFs: ExportFilesystem | null = null;
        let destinationExisted = false;
        if (path) {
          const expectedExtension = (
            codec.extension ?? (codec_id === "project" ? "bbmodel" : "json")
          ).toLowerCase();
          if (!path.toLowerCase().endsWith(`.${expectedExtension}`)) {
            throw new Error(
              `Export path for ${codec_id} must end in .${expectedExtension}; received ${path}.`
            );
          }

          // @ts-ignore - requireNativeModule is a Blockbench desktop global.
          exportFs = requireNativeModule("fs", {
            message: `BlockIT export_model requested write access to save ${codec_id} output to ${path}`,
          }) as ExportFilesystem | null;
          if (!exportFs) {
            throw new Error(
              "File system access was denied. Omit `path` to receive the compiled content in the MCP response."
            );
          }
          destinationExisted = exportFs.existsSync(path);
          if (destinationExisted) {
            // Blockbench's permission-scoped fs exposes Dirents, not lstatSync.
            // Dirents inspect the entry itself, so symlinks are not followed.
            const directory = path.slice(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1);
            const filename = filesystemFileName(path);
            const entries = exportFs.readdirSync(directory, { withFileTypes: true });
            const matches = entries.filter(entry => entry.name === filename ||
              (process.platform === "win32" && entry.name.toLowerCase() === filename.toLowerCase()));
            if (matches.length !== 1) {
              throw new Error(`Cannot identify a unique export destination entry ${path}; no file was written.`);
            }
            const destination = matches[0];
            if (destination.isSymbolicLink()) {
              throw new Error(
                `Refusing to write export through symbolic link ${path}. Choose the real destination path explicitly.`
              );
            }
            if (!destination.isFile()) {
              throw new Error(
                `Refusing to replace non-file export destination ${path}.`
              );
            }
          }
          if (codec_id === "bedrock" && destinationExisted) {
            throw new Error(
              `Refusing to overwrite existing Bedrock geometry file ${path}. Native Blockbench uses codec overwrite/merge semantics for existing multi-model geometry files; export_model will not bypass that behavior. Choose a new path or use native Blockbench export/save for the existing file.`
            );
          }
          if (
            codec_id === "project" &&
            overwrite !== true &&
            destinationExisted
          ) {
            throw new Error(
              `Refusing to replace the existing .bbmodel file ${path} without explicit consent. Pass overwrite: true, choose a new path, or save from the Blockbench editor directly.`
            );
          }
        }

        const effectiveOptions =
          options ??
          (typeof codec.getExportOptions === "function"
            ? codec.getExportOptions()
            : undefined);

        let rawResult: unknown;
        if (codec_id === "project" && path) {
          const previousSavePath = Project!.save_path;
          const previousName = Project!.name;
          try {
            // Native bbmodel export compiles relative assets and project identity against the target file.
            Project!.save_path = path;
            Project!.name = filesystemStem(path);
            rawResult = codec.compile(effectiveOptions);
          } finally {
            Project!.save_path = previousSavePath;
            Project!.name = previousName;
          }
        } else {
          rawResult = codec.compile(effectiveOptions);
        }

        const isArrayBuffer = rawResult instanceof ArrayBuffer;
        const isBinaryView =
          ArrayBuffer.isView(rawResult) && !(rawResult instanceof DataView);
        const binaryBuffer = isArrayBuffer
          ? Buffer.from(rawResult as ArrayBuffer)
          : isBinaryView
            ? Buffer.from(
                (rawResult as ArrayBufferView).buffer,
                (rawResult as ArrayBufferView).byteOffset,
                (rawResult as ArrayBufferView).byteLength
              )
            : null;

        const text = binaryBuffer ? null : toTextContent(rawResult);
        const byteLength = binaryBuffer
          ? binaryBuffer.byteLength
          : Buffer.byteLength(text ?? "", "utf8");
        const encoding: "utf-8" | "base64" = binaryBuffer ? "base64" : "utf-8";
        if (byteLength === 0) {
          throw new Error(
            `BlockIT codec "${codec_id}" compiled an empty artifact; no file was written.`
          );
        }

        let wrote_to_path: string | null = null;
        if (path && exportFs) {
          // Verify the lifecycle owner exists BEFORE touching the filesystem so
          // a failed verification never leaves a half-claimed artifact behind.
          if (typeof codec.afterSave !== "function") {
            throw new Error(
              `Codec "${codec_id}" does not implement the native afterSave() lifecycle owner required for verified filesystem writes. Omit \`path\` to receive the compiled content in the MCP response instead.`
            );
          }
          exportFs.writeFileSync(
            path,
            binaryBuffer ?? (text ?? ""),
            { flag: destinationExisted ? "w" : "wx" }
          );
          const writtenStat = exportFs.statSync(path);
          if (!writtenStat.isFile() || writtenStat.size !== byteLength) {
            throw new Error(
              `Export write verification failed for ${path}: expected a regular file of ${byteLength} bytes, got ${writtenStat.isFile() ? `${writtenStat.size} bytes` : "a non-file target"}. The path may exist, but export_model will not report it as a verified artifact.`
            );
          }
          codec.afterSave(path);
          const lifecycle = currentExportProjectLifecycle();
          const lifecycleMatches =
            codec_id === "project"
              ? lifecycle.save_path === path && lifecycle.saved
              : lifecycle.export_path === path &&
                lifecycle.export_codec === codec_id &&
                lifecycle.saved;
          if (!lifecycleMatches) {
            throw new Error(
              `Export artifact was written to ${path}, but native codec lifecycle state did not synchronize to that path.`
            );
          }
          wrote_to_path = path;
        }

        const fullContent = binaryBuffer
          ? binaryBuffer.toString("base64")
          : (text ?? "");
        // A successful filesystem write already delivers the artifact. Avoid
        // echoing large compiled content into model context unless requested.
        const effectiveMaxContentLength =
          max_content_length ?? (path ? 0 : 100_000);
        const truncated =
          effectiveMaxContentLength > 0 &&
          fullContent.length > effectiveMaxContentLength;
        const returnedContent =
          effectiveMaxContentLength === 0
            ? null
            : truncated
              ? sliceWithoutSplittingSurrogatePair(
                  fullContent,
                  effectiveMaxContentLength
                )
              : fullContent;

        const result = {
          project_format: "bedrock" as const,
          codec: {
            id: codec_id,
            name: codec.name ?? codec_id,
            extension: codec.extension ?? null,
          },
          file_name:
            path !== undefined
              ? filesystemFileName(path)
              : typeof codec.fileName === "function"
                ? codec.fileName()
                : Project!.name,
          byte_length: byteLength,
          encoding,
          wrote_to_path,
          project: currentExportProjectLifecycle(),
          truncated,
          content: returnedContent,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: wrote_to_path
                ? `Exported ${codec_id} artifact ${result.file_name} (${byteLength} bytes); file write verified.`
                : `Compiled ${codec_id} artifact ${result.file_name} (${byteLength} bytes); no file path was provided.`,
            },
          ],
          structuredContent: result,
        };
      },
    },
    exportToolDocs[1].status
  );
}
