/// <reference types="blockbench-types" />
import { z } from "zod";
import type {
  FormElementOptions,
  InputFormConfig,
} from "blockbench-types/generated/interface/form";
import { getAllPromptDefinitions, prompts } from "@/lib/factories";
import { openPromptOverrideDialog } from "@/ui/promptOverrideDialog";

/**
 * Extracts metadata from a Zod schema type for form generation
 */
function getZodTypeMeta(zodType: z.ZodType<any, any>): {
  type: FormElementOptions["type"];
  isOptional: boolean;
  description?: string;
  defaultValue?: unknown;
  enumValues?: string[];
} {
  const schema = z.toJSONSchema(zodType, {
    io: "input",
    target: "draft-2020-12",
    unrepresentable: "any",
    reused: "inline",
  }) as Record<string, unknown>;
  const parsedUndefined = zodType.safeParse(undefined);
  const enumValues = Array.isArray(schema.enum)
    ? schema.enum.filter((value): value is string => typeof value === "string")
    : undefined;

  let type: FormElementOptions["type"] = "text";
  if (schema.type === "number" || schema.type === "integer") type = "number";
  else if (schema.type === "boolean") type = "checkbox";
  else if (enumValues?.length) type = "select";
  else if (schema.type === "array" || schema.type === "object") type = "textarea";

  return {
    type,
    isOptional: parsedUndefined.success,
    description:
      typeof schema.description === "string" ? schema.description : undefined,
    defaultValue:
      parsedUndefined.success && parsedUndefined.data !== undefined
        ? parsedUndefined.data
        : undefined,
    enumValues,
  };
}

/**
 * Converts a Zod schema to Blockbench InputFormConfig
 */
function zodSchemaToFormConfig(
  argsSchema: Record<string, z.ZodType<any, any>>
): InputFormConfig {
  const formConfig: InputFormConfig = {};

  for (const [fieldName, zodType] of Object.entries(argsSchema)) {
    const meta = getZodTypeMeta(zodType);

    const fieldConfig: FormElementOptions = {
      label: `${fieldName}${meta.isOptional ? "" : " *"}`,
      description: meta.description || `Argument: ${fieldName}`,
      type: meta.type,
    };

    // Set default value
    if (meta.defaultValue !== undefined) {
      fieldConfig.value = meta.defaultValue;
    }

    // Handle placeholder from description
    if (meta.description) {
      fieldConfig.placeholder = meta.description;
    }

    // Handle enum options
    if (meta.enumValues) {
      fieldConfig.options = { "": "(none)" };
      for (const val of meta.enumValues) {
        fieldConfig.options[val] = val;
      }
    }

    formConfig[fieldName] = fieldConfig;
  }

  return formConfig;
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let contentDialog: Dialog | null = null;

/**
 * Shows the generated prompt content in a dialog
 */
function showPromptContentDialog(
  promptName: string,
  content: string,
  isError: boolean = false
) {
  contentDialog?.hide();

  contentDialog = new Dialog({
    id: "mcp_prompt_content",
    title: tl("mcp.dialog.prompt_title", [promptName]),
    width: 700,
    lines: [
      `<pre style="
        background: var(--color-back);
        padding: 12px;
        border-radius: 4px;
        overflow: auto;
        max-height: 500px;
        white-space: pre-wrap;
        word-break: break-word;
        color: ${isError ? "var(--color-error)" : "var(--color-text)"};
        font-family: var(--font-code);
        font-size: 12px;
        line-height: 1.5;
      ">${escapeHtml(content)}</pre>`,
    ],
    buttons: [tl("mcp.dialog.copy"), tl("mcp.dialog.edit_override"), tl("mcp.dialog.close")],
    onButton(buttonIndex: number) {
      if (buttonIndex === 0) {
        navigator.clipboard.writeText(content).then(() => {
          Blockbench.showQuickMessage(tl("mcp.dialog.prompt_copied"), 1500);
        }).catch(() => {
          Blockbench.showQuickMessage(tl("mcp.dialog.copy_failed"), 1500);
        });
        return false; // Keep dialog open
      }
      if (buttonIndex === 1) {
        openPromptOverrideDialog(promptName);
        return; // Close content dialog, open override dialog
      }
    },
  });

  contentDialog.show();
}

let currentDialog: Dialog | null = null;

/**
 * Opens a dialog to preview an MCP prompt
 */
export function promptPreviewDialogTeardown(): void {
  currentDialog?.hide();
  currentDialog = null;
  contentDialog?.hide();
  contentDialog = null;
}

export function openPromptPreviewDialog(promptName: string) {
  const promptDefs = getAllPromptDefinitions();
  const promptDef = promptDefs[promptName];

  if (!promptDef) {
    Blockbench.showQuickMessage(tl("mcp.dialog.prompt_not_found", [promptName]), 2000);
    return;
  }

  if (!prompts[promptName]?.enabled) {
    Blockbench.showQuickMessage(
      `Prompt "${promptName}" is disabled and is not exposed through MCP.`,
      2500
    );
    return;
  }

  // Close any existing dialog
  currentDialog?.hide();

  const argsShape = promptDef.argsSchema?.shape;
  const hasArgs = Boolean(argsShape && Object.keys(argsShape).length > 0);
  const formConfig = hasArgs ? zodSchemaToFormConfig(argsShape!) : {};

  async function generatePromptPreview(
    formResult: Record<string, unknown>
  ): Promise<void> {
    // Filter out empty values for optional args
    const args: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(formResult)) {
      if (value !== "" && value !== undefined && value !== null) {
        args[key] = value;
      }
    }

    Blockbench.showQuickMessage(tl("mcp.dialog.generating_prompt"), 1000);

    try {
      const result = await promptDef.generate(args);

      // MCP prompt content is a ContentBlock union, not text-only. Render text
      // blocks directly and preserve other valid MCP content without guessing at
      // fields that do not exist on their content type.
      const content = result.messages
        .map((msg) => {
          const roleLabel = msg.role === "user"
            ? tl("mcp.dialog.role_user")
            : tl("mcp.dialog.role_assistant");
          const renderedContent = msg.content.type === "text"
            ? msg.content.text
            : JSON.stringify(msg.content, null, 2);
          return `[${roleLabel}]\n${renderedContent}`;
        })
        .join("\n\n---\n\n");

      showPromptContentDialog(promptName, content);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      showPromptContentDialog(promptName, `Error: ${errorMessage}`, true);
    }
  }

  currentDialog = new Dialog({
    id: "mcp_prompt_preview",
    title: promptDef.title || promptName,
    width: 500,
    form: hasArgs ? formConfig : undefined,
    lines: [
      `<p style="margin-bottom: 12px; color: var(--color-subtle_text);">${escapeHtml(promptDef.description)}</p>`,
      ...(hasArgs ? [] : [`<p style="color: var(--color-subtle_text); font-style: italic;">${tl("mcp.dialog.no_arguments")}</p>`]),
    ],
    buttons: [tl("mcp.dialog.generate_prompt"), tl("mcp.dialog.cancel")],
    confirmIndex: 0,
    cancelIndex: 1,
    onConfirm(formResult: Record<string, unknown>) {
      void generatePromptPreview(formResult);
    },
  });

  currentDialog.show();
}

/**
 * Gets prompt info for display in UI
 */
export function getPromptInfo(promptName: string): {
  name: string;
  title: string;
  description: string;
  argumentCount: number;
} | null {
  const promptDefs = getAllPromptDefinitions();
  const promptDef = promptDefs[promptName];

  if (!promptDef) return null;

  return {
    name: promptName,
    title: promptDef.title,
    description: promptDef.description,
    argumentCount: promptDef.argsSchema ? Object.keys(promptDef.argsSchema.shape).length : 0,
  };
}
