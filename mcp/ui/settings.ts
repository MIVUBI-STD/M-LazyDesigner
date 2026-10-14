import { MCP_EXTENDED_FAMILIES_SETTING_ID } from "@/lib/registrationProfile";
import {
  DEFAULT_MCP_AUTHORING_PHASE,
  MCP_AUTHORING_PHASE_SETTING_ID,
} from "@/lib/authoringPhase";

const settings: Setting[] = [];
let extendedProfileHandler: ((enabled: boolean) => void) | undefined;

const EXTENDED_FAMILIES_STORAGE_KEY =
  "blockit_mcp.extended_families_enabled";

export function setExtendedMcpFamiliesEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(
      EXTENDED_FAMILIES_STORAGE_KEY,
      enabled ? "true" : "false"
    );
  } catch {
    // The normal Blockbench setting remains the fallback source.
  }
  Settings.save();
  Blockbench.showQuickMessage(
    `Legacy compatibility ${enabled ? "enabled" : "disabled"}.`,
    2500
  );
  extendedProfileHandler?.(enabled);
}

export function setExtendedMcpProfileHandler(
  handler: (enabled: boolean) => void
): void {
  extendedProfileHandler = handler;
}

export function clearExtendedMcpProfileHandler(): void {
  extendedProfileHandler = undefined;
}

export function isExtendedMcpFamiliesEnabled(): boolean {
  try {
    const storedValue = localStorage.getItem(EXTENDED_FAMILIES_STORAGE_KEY);
    if (storedValue === "true" || storedValue === "false") {
      return storedValue === "true";
    }
  } catch {
    // Fall through to the normal Blockbench setting.
  }
  return Settings.get(MCP_EXTENDED_FAMILIES_SETTING_ID) === true;
}

export function settingsSetup(): void {
  settingsTeardown();
  const category = "general";

  settings.push(
    new Setting("mcp_port", {
      name: "Connection Port (Advanced)",
      description:
        "Internal connection setting. Leave this at the default unless troubleshooting requires a different port.",
      type: "number",
      value: 3000,
      category,
      icon: "numbers",
    }),
    new Setting("mcp_endpoint", {
      name: "Connection Path (Advanced)",
      description:
        "Internal connection setting. Leave this at the default for normal use.",
      type: "text",
      value: "/bb-mcp",
      category,
      icon: "webhook",
    }),
    new Setting(MCP_AUTHORING_PHASE_SETTING_ID, {
      name: "Startup Focus (Advanced)",
      description:
        "Used only when LazyDesigner starts or reloads. AI switches between authoring and animation automatically during normal use.",
      type: "select",
      value: DEFAULT_MCP_AUTHORING_PHASE,
      options: {
        geometry: "Geometry",
        texturing: "Texturing",
        animation: "Animation",
      },
      requires_restart: true,
      category,
    }),
    new Setting(MCP_EXTENDED_FAMILIES_SETTING_ID, {
      name: "Legacy Compatibility (Developer)",
      description:
        "Troubleshooting support for older or generic Blockbench workflows. Leave this off for normal use.",
      type: "toggle",
      value: false,
      category,
      icon: "extension",
      onChange(value) {
        setExtendedMcpFamiliesEnabled(value === true);
      },
    })
  );
}

export function settingsTeardown(): void {
  extendedProfileHandler = undefined;
  for (const setting of settings.splice(0)) {
    // Native Setting recreation reads the startup cache, not current storage.
    const stored = Settings.stored as unknown as Record<string, { value: Setting["master_value"] }>;
    stored[setting.id] = { value: setting.master_value };
    setting.delete();
  }
}
