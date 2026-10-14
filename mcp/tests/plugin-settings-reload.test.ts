import { expect, test } from "bun:test";
import { settingsSetup, settingsTeardown } from "@/ui/settings";

test("native reload retains master settings without persisting profile overrides", () => {
  const globals = globalThis as any;
  const originalSetting = globals.Setting;
  const originalSettings = globals.Settings;
  const registry = new Map<string, any>();
  const stored: Record<string, { value: unknown }> = {};
  class NativeSetting {
    master_value: unknown;
    constructor(public id: string, data: { value: unknown }) {
      // Blockbench 5.2 reads the startup cache, not the removed Setting instance.
      this.master_value = stored[id]?.value ?? data.value;
      registry.set(id, this);
    }
    get value() { return "active-profile-override"; }
    delete() { registry.delete(this.id); }
  }
  try {
    globals.Setting = NativeSetting;
    globals.Settings = { stored };
    settingsSetup();
    registry.get("mcp_port").master_value = 3011;
    registry.get("mcp_endpoint").master_value = "/acceptance-test";
    const toggle = [...registry.values()].find(setting => setting.master_value === false)!;
    const toggleId = toggle.id;
    toggle.master_value = false;
    settingsTeardown();
    expect(registry.size).toBe(0);
    settingsSetup();
    expect(registry.get("mcp_port").master_value).toBe(3011);
    expect(registry.get("mcp_endpoint").master_value).toBe("/acceptance-test");
    expect(registry.get(toggleId).master_value).toBe(false);
    registry.get("mcp_endpoint").master_value = "";
    settingsTeardown();
    settingsSetup();
    expect(registry.get("mcp_endpoint").master_value).toBe("");
  } finally {
    settingsTeardown();
    globals.Setting = originalSetting;
    globals.Settings = originalSettings;
  }
});
