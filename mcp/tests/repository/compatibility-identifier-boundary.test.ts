import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("LazyDesigner compatibility identifier boundary", () => {
  test("install, protocol and persisted identifiers remain stable during presentation rename", async () => {
    const [pkgText, protocol, backend, affinity, settings, authoringPhase, profile, plugin, statusBar] = await Promise.all([
      source("package.json"),
      source("gateway/contracts/protocol.ts"),
      source("gateway/runtime/backend.ts"),
      source("lib/runtime/affinity.ts"),
      source("ui/settings.ts"),
      source("lib/capabilities/authoringStage.ts"),
      source("lib/capabilities/registrationProfile.ts"),
      source("index.ts"),
      source("ui/statusBar.ts"),
    ]);
    const pkg = JSON.parse(pkgText) as { name: string; main: string };

    expect(pkg.name).toBe("lazydesigner-bedrock-entity-mcp");
    expect(pkg.main).toBe("dist/lazydesigner_mcp.js");
    expect(protocol).toContain('GATEWAY_NAME = "lazydesigner-gateway"');
    expect(backend).toContain("process.env.LAZYDESIGNER_RUNTIME_URL");
    expect(backend).toContain("process.env.LAZYDESIGNER_GATEWAY_MAX_QUEUE_DEPTH");
    expect(backend).toContain('name: "lazydesigner-gateway-runtime-client"');
    expect(affinity).toContain('"x-lazydesigner-project-uuid"');
    expect(affinity).toContain('"x-lazydesigner-authoring-stage"');
    expect(settings).toContain('"lazydesigner_mcp.extended_families_enabled"');
    expect(authoringPhase).toContain('MCP_AUTHORING_PHASE_SETTING_ID = "mcp_authoring_phase"');
    expect(profile).toContain('"mcp_extended_families_enabled"');
    expect(plugin).toContain('BBPlugin.register("lazydesigner_mcp"');
    expect(plugin).toContain("__LAZYDESIGNER_BUILD_ID__");
    expect(statusBar).toContain('"lazydesigner-runtime-status-changed"');
  });

  test("human-facing Runtime, Gateway and UI language uses LazyDesigner or neutral compatibility language", async () => {
    const [backend, queue, affinity, settings, plugin, server, ui, panel, statusBar, readme] = await Promise.all([
      source("gateway/runtime/backend.ts"),
      source("gateway/runtime/operationQueue.ts"),
      source("lib/runtime/affinity.ts"),
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
    expect(statusBar).toContain('return "LazyDesigner Runtime Ready"');
    expect(statusBar).toContain("Open LazyDesigner panel");
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

  test("runtime export failures do not advertise the retired product identity", async () => {
    const exporter = await source("server/tools/io/export.ts");
    expect(exporter).toContain("LazyDesigner model export requires");
    expect(exporter).toContain("Required Blockbench codec");
    expect(exporter).toContain("LazyDesigner export_model requested write access");
    expect(exporter).not.toContain("Required BlockIT codec");
    expect(exporter).not.toContain("BlockIT codec ");
    // Compatibility-bound TS codec IDs are deliberately not bulk-renamed.
    expect(exporter).toContain("BLOCKIT_MODEL_CODEC_IDS");
  });

  test("canonical generators own current product branding, not the active Stage catalog", async () => {
    const [generator, manifest, exporter, install] = await Promise.all([
      source("scripts/generate/generate-docs.ts"),
      source("scripts/generate/internal/docs-manifest.ts"),
      source("server/tools/io/export.ts"),
      source("docs/llms/install.md"),
    ]);
    expect(generator).toContain('import { PRODUCT_NAME } from "../../lib/product/productIdentity"');
    expect(generator).toContain("<title>${escapeHtml(PRODUCT_NAME)} — API Reference</title>");
    expect(generator.match(/<h1>\$\{escapeHtml\(PRODUCT_NAME\)\}<\/h1>/g)).toHaveLength(2);
    expect(generator).toContain("not the active Runtime tool surface");
    expect(generator).not.toContain("BlockIT — Bedrock Entity MCP");
    expect(manifest).toContain("Compact LazyDesigner workflow");
    expect(manifest).not.toContain("Compact BlockIT workflow");
    expect(exporter).toContain("List LazyDesigner Model Outputs");
    expect(exporter).toContain("Lists the model outputs intentionally exposed by LazyDesigner");
    expect(exporter).toContain("LazyDesigner output: `bedrock`");
    expect(exporter).toContain("BLOCKIT_MODEL_CODEC_IDS"); // compatibility type only
    expect(install).toContain("mcp/dist/lazydesigner_mcp.js");
    expect(install).not.toContain("mcp/dist/blockit_mcp.js");
    expect(install).toContain("Legacy Compatibility (Developer)");
  });

  test("compatibility policy explicitly forbids blind bulk rename", async () => {
    const policy = await source("../docs/04-system/compatibility-identifiers.md");
    expect(policy).toContain("Active Decision — Canonical LazyDesigner-only Installation");
    expect(policy).toContain("Compatibility-Bound Identifiers");
    expect(policy).toContain("Presentation Identity");
    expect(policy).toContain("Migration Preconditions");
  });
});
