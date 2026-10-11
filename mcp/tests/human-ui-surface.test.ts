import { describe, expect, test } from "bun:test";
import { connectionChanged } from "../../apps/desktop/src/connectionWatch";

const source = (relative: string) =>
  Bun.file(new URL(`../${relative}`, import.meta.url)).text();

describe("human-facing Blockbench UI", () => {
  test("normal panel exposes only human status and useful project actions", async () => {
    const panel = await source("ui/panel.html");

    expect(panel).toContain("LazyDesigner status");
    expect(panel).toContain("Current project");
    expect(panel).toContain("Open Project Folder");
    expect(panel).toContain("Technical authoring runs through your connected AI client.");

    for (const internal of [
      "Advanced details",
      "Tools",
      "Resources",
      "Workflow",
      "Runtime endpoint",
      "Tool catalog",
      "Coming soon",
    ]) {
      expect(panel).not.toContain(internal);
    }
  });

  test("status wording stays simple and actionable", async () => {
    const [ui, statusBar] = await Promise.all([
      source("ui/index.ts"),
      source("ui/statusBar.ts"),
    ]);

    expect(ui).toContain('return "Runtime ready"');
    expect(ui).toContain('return "Starting"');
    expect(ui).toContain('return "Needs attention"');
    expect(ui).toContain('return "Local Runtime is ready. AI client connection is managed separately."');
    expect(ui).toContain('return "AI authoring is not available right now."');

    expect(statusBar).toContain('return "LazyDesigner Runtime Ready"');
    expect(statusBar).toContain('return "LazyDesigner Needs Attention"');
    expect(statusBar).not.toContain("runtimeAddress");
    expect(statusBar).not.toContain("127.0.0.1");
  });

  test("project display is event-driven and folder access reuses Blockbench native action", async () => {
    const ui = await source("ui/index.ts");

    for (const event of [
      "select_project",
      "new_project",
      "setup_project",
      "load_project",
      "save_project",
      "close_project",
    ]) {
      expect(ui).toContain(`"${event}"`);
    }
    expect(ui).toContain("Blockbench.on(event, callback)");
    expect(ui).toContain("Blockbench.removeListener(event, callback)");
    expect(ui).toContain("open_model_folder");
    expect(ui).not.toContain("setInterval(");
  });

  test("recovery actions are contextual and copied support details avoid local paths", async () => {
    const [panel, ui, reload] = await Promise.all([
      source("ui/panel.html"),
      source("ui/index.ts"),
      source("plugin/reload.ts"),
    ]);

    expect(panel).toContain("runtime.state === 'failed'");
    expect(panel).toContain("Reload LazyDesigner");
    expect(panel).toContain("Copy Error Details");
    expect(ui).toContain("reloadLazyDesignerPlugin()");
    expect(ui).toContain("LazyDesigner support details");
    expect(ui).not.toContain("Project.save_path}");
    expect(ui).not.toContain("Project.export_path}");
    expect(reload).toContain("canReloadLazyDesignerPlugin");
    expect(reload).toContain("reloadLazyDesignerPlugin");
  });

  test("dev auto-reload and human reload share one native plugin owner", async () => {
    const [devSync, reload] = await Promise.all([
      source("plugin/devSync.ts"),
      source("plugin/reload.ts"),
    ]);

    expect(devSync).toContain("getReloadableLazyDesignerPlugin");
    expect(devSync).not.toContain("function getReloadableBlockItPlugin");
    expect(reload).toContain("plugin.reload()");
  });

  test("normal plugin metadata keeps creator credentials anonymous", async () => {
    const plugin = await source("index.ts");

    expect(plugin).toContain('title: "LazyDesigner"');
    expect(plugin).toContain('author: "Anonymous"');
    expect(plugin).toContain('repository: ""');
    expect(plugin).toContain('bug_tracker: ""');

    expect(plugin).not.toContain("@author");
    expect(plugin).not.toContain("@discord");
    expect(plugin).not.toContain("@github");
    expect(plugin).not.toContain("compatibility surface switched");
    expect(plugin).not.toContain("MCP phase switched");
  });

  test("rare manual settings are clearly marked advanced or developer-only", async () => {
    const settings = await source("ui/settings.ts");

    expect(settings).toContain("Connection Port (Advanced)");
    expect(settings).toContain("Connection Path (Advanced)");
    expect(settings).toContain("Startup Focus (Advanced)");
    expect(settings).toContain("Legacy Compatibility (Developer)");
    expect(settings).toContain("Leave this at the default for normal use.");
    expect(settings).toContain("Leave this off for normal use.");
  });

  test("panel mounts before the network permission gate", async () => {
    const [entry, status, css, panel] = await Promise.all([
      source("index.ts"), source("ui/statusBar.ts"), source("ui/panel.css"), source("ui/index.ts"),
    ]);
    expect(entry).toContain("blockbenchIntegration.setupUi(registrationProfile, authoringStage)");
    expect(entry.indexOf("blockbenchIntegration.setupUi(registrationProfile, authoringStage)"))
      .toBeLessThan(entry.indexOf("runtimeHost.acquireNativeNetwork(generation)"));
    expect(entry).toContain('setStatusBarState("failed"');
    expect(status).toContain('document.createElement("button")');
    expect(status).toContain('state: "starting"');
    expect(css).not.toContain("nth-last-child");
    expect(panel).not.toContain("pluginBrowserSetup");
  });

  test("Desktop connection observations are conservative", () => {
    const baseline = {
      blockbench: { running: true },
      runtime_listener_live: true,
      plugin_integrity: "ready",
      managed: { gateway_active: true },
      project_navigation: { revision: "rev1", session_live: true },
    };
    const observation = {
      blockbench_running: true,
      runtime_listener_live: true,
      gateway_active: null,
      plugin_integrity: "ready",
      project_revision: "rev1",
      project_session_live: true,
    };
    expect(connectionChanged(observation, baseline)).toBe(false);
    expect(connectionChanged({ ...observation, gateway_active: false }, baseline)).toBe(true);
    expect(connectionChanged({ ...observation, project_revision: "rev2" }, baseline)).toBe(true);
    expect(connectionChanged({ ...observation, runtime_listener_live: false }, baseline)).toBe(true);
    expect(connectionChanged({ ...observation, gateway_active: false }, { ...baseline, managed: null })).toBe(false);
  });

  test("Desktop guards overlapping probes and signals stale state", async () => {
    const app = await Bun.file(new URL("../../apps/desktop/src/App.svelte", import.meta.url)).text();
    expect(app).toContain("statusProbeInFlight");
    expect(app).toContain("statusProbeFailures >= 2");
    expect(app).toContain("connectionChanged(candidate, status)");
  });
});
