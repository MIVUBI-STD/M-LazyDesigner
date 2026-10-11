import type { IMCPTool, IMCPPrompt, IMCPResource } from "@/types";
import type { McpRegistrationProfile } from "@/lib/registrationProfile";
import type { McpAuthoringPhase } from "@/lib/authoringPhase";
import {
  canReloadLazyDesignerPlugin,
  reloadLazyDesignerPlugin,
} from "@/plugin/reload";
import {
  BLOCKIT_RUNTIME_STATUS_CHANGED,
  statusBarSetup,
  statusBarTeardown,
  type BlockItRuntimeStatusDetail,
  type McpServerStatus,
} from "@/ui/statusBar";
import { toolTestDialogTeardown } from "@/ui/toolTestDialog";
import { promptPreviewDialogTeardown } from "@/ui/promptPreviewDialog";
import { overrideDialogTeardown } from "@/ui/promptOverrideDialog";
import panelCSS from "@/ui/panel.css";
import template from "@/ui/panel.html";

let panel: Panel | undefined;
let runtimeStatusListener: (() => void) | undefined;
let projectStateListener: (() => void) | undefined;
let panelCssHandle: { delete(): void } | undefined;

type UiSetupInput = {
  tools: Record<string, IMCPTool>;
  resources: Record<string, IMCPResource>;
  prompts: Record<string, IMCPPrompt>;
  profile: McpRegistrationProfile;
  phase: McpAuthoringPhase;
};

type HumanProjectState = {
  open: boolean;
  name: string;
  hasFolder: boolean;
};

type HumanPanelContext = {
  runtime: {
    state: McpServerStatus;
    detail: string;
  };
  project: HumanProjectState;
};

function readHumanProjectState(): HumanProjectState {
  if (typeof Project === "undefined" || !Project) {
    return { open: false, name: "No project open", hasFolder: false };
  }

  const rawName = String(Project.name ?? "").trim();
  return {
    open: true,
    name: rawName || "Untitled project",
    hasFolder: Boolean(Project.save_path || Project.export_path),
  };
}

function subscribeProjectState(callback: () => void): () => void {
  const events = [
    "select_project",
    "new_project",
    "setup_project",
    "load_project",
    "save_project",
    "close_project",
    "update_project_settings",
  ] as const;

  for (const event of events) Blockbench.on(event, callback);
  return () => {
    for (const event of events) Blockbench.removeListener(event, callback);
  };
}

async function copyPlainText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the DOM copy fallback below.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

export function uiSetup(input: UiSetupInput) {
  // Keep the public setup contract stable even though normal human UI no longer
  // exposes Runtime registries or AI workflow internals.
  void input.tools;
  void input.resources;
  void input.prompts;

  // Blockbench reload order is not guaranteed to be perfectly serialized.
  // Make setup idempotent by clearing every UI/listener owner before rebuilding.
  uiTeardown();

  panelCssHandle = Blockbench.addCSS(panelCSS);
  statusBarSetup();

  panel = new Panel("mcp_panel", {
    id: "mcp_panel",
    icon: "robot",
    name: "LazyDesigner",
    default_side: "right",
    resizable: true,
    component: {
      mounted() {
        // @ts-ignore - Vue component context
        const vm = this;

        const statusHandler = (event: Event) => {
          const detail = (event as CustomEvent<BlockItRuntimeStatusDetail>).detail;
          if (!detail) return;
          vm.runtime.state = detail.state;
          vm.runtime.detail = detail.detail ?? "";
        };
        document.addEventListener(BLOCKIT_RUNTIME_STATUS_CHANGED, statusHandler);
        runtimeStatusListener?.();
        runtimeStatusListener = () =>
          document.removeEventListener(BLOCKIT_RUNTIME_STATUS_CHANGED, statusHandler);

        const refreshProject = () => {
          const next = readHumanProjectState();
          vm.project.open = next.open;
          vm.project.name = next.name;
          vm.project.hasFolder = next.hasFolder;
        };
        projectStateListener?.();
        projectStateListener = subscribeProjectState(refreshProject);
        refreshProject();
      },
      beforeDestroy() {
        runtimeStatusListener?.();
        runtimeStatusListener = undefined;
        projectStateListener?.();
        projectStateListener = undefined;
      },
      data: () => ({
        runtime: {
          state: "running" as McpServerStatus,
          detail: "",
        },
        project: readHumanProjectState(),
        canReload: canReloadLazyDesignerPlugin(),
      }),
      methods: {
        runtimeStatusLabel(state: McpServerStatus): string {
          if (state === "starting") return "Starting";
          if (state === "failed") return "Needs attention";
          return "Runtime ready";
        },
        runtimeStatusMessage(state: McpServerStatus): string {
          if (state === "starting") return "Preparing AI authoring...";
          if (state === "failed") return "AI authoring is not available right now.";
          return "Local Runtime is ready. AI client connection is managed separately.";
        },
        openProjectFolder(): void {
          if (!Project || (!Project.save_path && !Project.export_path)) {
            Blockbench.showQuickMessage(
              "Save this project once to open its folder.",
              3000
            );
            return;
          }

          const action = (BarItems as unknown as {
            open_model_folder?: {
              trigger(): unknown;
              conditionMet?: () => boolean;
            };
          }).open_model_folder;

          if (!action || (action.conditionMet && !action.conditionMet())) {
            Blockbench.showQuickMessage(
              "The project folder is not available yet.",
              3000
            );
            return;
          }
          action.trigger();
        },
        reloadLazyDesigner(): void {
          if (reloadLazyDesignerPlugin()) return;
          Blockbench.showQuickMessage(
            "Reload is not available for this installation. Restart Blockbench instead.",
            4000
          );
        },
        async copyErrorDetails(this: HumanPanelContext): Promise<void> {
          const detail = String(this.runtime.detail || "").trim();
          const text = [
            "LazyDesigner support details",
            `Status: ${this.runtime.state}`,
            `Blockbench: ${Blockbench.version}`,
            `Project: ${this.project.open ? this.project.name : "No project open"}`,
            `Authoring stage: ${input.phase}`,
            `Message: ${detail || "No additional error detail was reported."}`,
          ].join("\n");

          if (await copyPlainText(text)) {
            Blockbench.showQuickMessage("Error details copied.", 2500);
          } else {
            Blockbench.showQuickMessage(
              "Could not copy the error details. Check the console instead.",
              3500
            );
          }
        },
      },
      name: "mcp_panel",
      template,
    },
    expand_button: true,
  });

  return panel;
}

export function uiTeardown(): void {
  runtimeStatusListener?.();
  runtimeStatusListener = undefined;
  projectStateListener?.();
  projectStateListener = undefined;

  // These dialogs are no longer part of the normal human-facing panel, but
  // teardown remains so hot reload can safely close one opened by an older build.
  overrideDialogTeardown();
  toolTestDialogTeardown();
  promptPreviewDialogTeardown();

  statusBarTeardown();
  panel?.delete();
  panel = undefined;
  panelCssHandle?.delete();
  panelCssHandle = undefined;
}
