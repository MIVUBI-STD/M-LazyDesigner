import statusBarCSS from "@/ui/statusBar.css";

let statusBarElement: HTMLDivElement | undefined;
let statusBarCssHandle: { delete(): void } | undefined;
let statusIndicator: HTMLButtonElement | undefined;
let statusDot: HTMLDivElement | undefined;
let statusText: HTMLSpanElement | undefined;

export type McpServerStatus = "running" | "starting" | "failed";
export interface BlockItRuntimeStatusDetail {
  state: McpServerStatus;
  detail?: string;
}

export const LAZYDESIGNER_RUNTIME_STATUS_CHANGED = "lazydesigner-runtime-status-changed";
/** @deprecated Source-only alias for the canonical LazyDesigner status event. */
export const BLOCKIT_RUNTIME_STATUS_CHANGED = LAZYDESIGNER_RUNTIME_STATUS_CHANGED;

let currentStatus: BlockItRuntimeStatusDetail = { state: "starting" };

// A panel mounted after a state transition must not fabricate Runtime readiness.
// Return a defensive snapshot; the status bar remains the single status owner.
export function getStatusBarState(): { state: McpServerStatus; detail: string } {
  return { state: currentStatus.state, detail: currentStatus.detail ?? "" };
}

function statusLabel(state: McpServerStatus): string {
  if (state === "starting") return "LazyDesigner Starting";
  if (state === "failed") return "LazyDesigner Needs Attention";
  return "LazyDesigner Runtime Ready";
}

function renderStatus(): void {
  if (statusDot) statusDot.className = `mcp-status-dot ${currentStatus.state}`;
  if (statusText) statusText.textContent = statusLabel(currentStatus.state);
  if (!statusIndicator) return;

  statusIndicator.title = [
    statusLabel(currentStatus.state),
    "Open LazyDesigner panel",
  ].join(" · ");
  statusIndicator.setAttribute("aria-label", statusIndicator.title);
}

function emitStatus(): void {
  if (typeof document === "undefined") return;
  document.dispatchEvent(
    new CustomEvent<BlockItRuntimeStatusDetail>(BLOCKIT_RUNTIME_STATUS_CHANGED, {
      detail: { ...currentStatus },
    })
  );
}

export function setStatusBarState(
  state: McpServerStatus,
  detail?: string
): void {
  currentStatus = detail ? { state, detail } : { state };
  renderStatus();
  emitStatus();
}

export function statusBarSetup(): void {
  statusBarTeardown();
  statusBarCssHandle = Blockbench.addCSS(statusBarCSS);

  const existingStatusBar = document.getElementById("status_bar");
  if (!existingStatusBar) {
    console.warn("Could not find status_bar element");
    statusBarCssHandle.delete();
    statusBarCssHandle = undefined;
    return;
  }

  statusBarElement = document.createElement("div");
  statusBarElement.id = "mcp-status-bar";

  statusIndicator = document.createElement("button");
  statusIndicator.type = "button";
  statusIndicator.className = "mcp-status-indicator";

  statusDot = document.createElement("div");
  statusDot.className = "mcp-status-dot";

  statusText = document.createElement("span");
  statusText.className = "mcp-status-text";
  statusText.setAttribute("aria-live", "polite");

  statusIndicator.appendChild(statusDot);
  statusIndicator.appendChild(statusText);
  statusBarElement.appendChild(statusIndicator);

  statusIndicator.addEventListener("click", () => {
    // @ts-ignore - Blockbench Panel types
    const mcpPanel = Panels.mcp_panel;
    if (!mcpPanel) return;
    if (mcpPanel.folded) {
      mcpPanel.fold(false);
      return;
    }
    if (mcpPanel.slot === "float") mcpPanel.moveToFront();
  });

  existingStatusBar.appendChild(statusBarElement);
  renderStatus();
}

export function statusBarTeardown(): void {
  statusBarElement?.remove();
  statusBarElement = undefined;
  statusIndicator = undefined;
  statusDot = undefined;
  statusText = undefined;
  statusBarCssHandle?.delete();
  statusBarCssHandle = undefined;
}
