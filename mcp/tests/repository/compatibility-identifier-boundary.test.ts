import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("LazyDesigner compatibility identifier boundary", () => {
  test("install, protocol and persisted identifiers remain stable during presentation rename", async () => {
    const [pkgText, protocol, backend, affinity, settings, authoringPhase, profile, plugin, statusBar] = await Promise.all([
      source("package.json"),
      source("gateway/protocol.ts"),
      source("gateway/backend.ts"),
      source("lib/runtimeAffinity.ts"),
      source("ui/settings.ts"),
      source("lib/authoringPhase.ts"),
      source("lib/registrationProfile.ts"),
      source("index.ts"),
      source("ui/statusBar.ts"),
    ]);
    const pkg = JSON.parse(pkgText) as { name: string; main: string };

    expect(pkg.name).toBe("blockit-bedrock-entity-mcp");
    expect(pkg.main).toBe("dist/blockit_mcp.js");
    expect(protocol).toContain('GATEWAY_NAME = "blockit-gateway"');
    expect(backend).toContain("process.env.BLOCKIT_RUNTIME_URL");
    expect(backend).toContain("process.env.BLOCKIT_GATEWAY_MAX_QUEUE_DEPTH");
    expect(backend).toContain('name: "blockit-gateway-runtime-client"');
    expect(affinity).toContain('"x-blockit-project-uuid"');
    expect(affinity).toContain('"x-blockit-authoring-phase"');
    expect(settings).toContain('"blockit_mcp.extended_families_enabled"');
    expect(authoringPhase).toContain('MCP_AUTHORING_PHASE_SETTING_ID = "mcp_authoring_phase"');
    expect(profile).toContain('"mcp_extended_families_enabled"');
    expect(plugin).toContain('BBPlugin.register("blockit_mcp"');
    expect(plugin).toContain("__BLOCKIT_BUILD_ID__");
    expect(statusBar).toContain('BLOCKIT_RUNTIME_STATUS_CHANGED = "blockit-runtime-status-changed"');
  });

  test("human-facing Runtime, Gateway and UI language uses LazyDesigner or neutral compatibility language", async () => {
    const [backend, queue, affinity, settings, plugin, server, ui, panel, statusBar, readme] = await Promise.all([
      source("gateway/backend.ts"),
      source("gateway/runtime/operationQueue.ts"),
      source("lib/runtimeAffinity.ts"),
      source("ui/settings.ts"),
      source("index.ts"),
      source("server/server.ts"),
      source("ui/index.ts"),
      source("ui/panel.html"),
      source("ui/statusBar.ts"),
      source("README.md"),
    ]);

    expect(queue).toContain("LazyDesigner Gateway queue is full");
    expect(backend).toContain("The connected LazyDesigner Runtime");
    expect(backend).toContain("current LazyDesigner surface");
    expect(affinity).toContain("LazyDesigner project affinity");
    expect(affinity).toContain("LazyDesigner authoring phase affinity");
    expect(settings).toContain('name: "Legacy Compatibility (Developer)"');
    expect(settings).toContain("Leave this off for normal use");
    expect(server).toContain("LazyDesigner Bedrock Entity authoring");
    expect(plugin).toContain('title: "LazyDesigner"');
    expect(plugin).toContain('Blockbench.showQuickMessage("LazyDesigner installed"');
    expect(plugin).toContain('Blockbench.showQuickMessage("LazyDesigner removed"');
    expect(plugin).toContain("LazyDesigner runtime initialization failed");
    expect(ui).toContain('name: "LazyDesigner"');
    expect(panel).toContain('class="lazydesigner-card"');
    expect(panel).toContain('aria-label="LazyDesigner status"');
    expect(statusBar).toContain('return "LazyDesigner Starting"');
    expect(statusBar).toContain('return "LazyDesigner Needs Attention"');
    expect(statusBar).toContain('return "LazyDesigner Ready"');
    expect(statusBar).toContain("Click to open LazyDesigner");
    expect(readme).toContain("LazyDesigner");

    expect(queue).not.toContain("BlockIT Gateway queue is full");
    expect(backend).not.toContain("connected BlockIT Runtime");
    expect(backend).not.toContain("current BlockIT surface");
    expect(affinity).not.toContain('throw new Error("BlockIT');
    expect(settings).not.toContain("BlockIT Legacy UI Fallbacks");
    expect(server).not.toContain("BlockIT Bedrock Entity authoring");
    expect(plugin).not.toContain("Installed BlockIT Bedrock Entity MCP");
    expect(plugin).not.toContain("Uninstalled BlockIT Bedrock Entity MCP");
    expect(ui).not.toContain('name: "BlockIT"');
    expect(panel).not.toContain('aria-label="BlockIT Runtime status"');
    expect(statusBar).not.toContain('return "BlockIT');
  });

  test("compatibility policy explicitly forbids blind bulk rename", async () => {
    const policy = await source("../docs/04-system/compatibility-identifiers.md");
    expect(policy).toContain("Do not bulk-replace `blockit` across the repository");
    expect(policy).toContain("Compatibility-Bound Identifiers");
    expect(policy).toContain("Presentation Identity");
    expect(policy).toContain("Migration Preconditions");
  });
});
