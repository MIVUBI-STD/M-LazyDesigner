import { describe, expect, test } from "bun:test";

async function source(path: string): Promise<string> {
  return Bun.file(path).text();
}

describe("pre-local plugin runtime cleanup", () => {
  test("MCP ownership is request-only with BlockIT identity", async () => {
    const server = await source("server/server.ts");
    const factories = await source("lib/factories.ts");

    expect(server).toContain("PRODUCT_NAME");
    expect(server).not.toContain("serverInstance");
    expect(server).not.toContain("getServer");
    expect(server).not.toContain("setServer");
    expect(factories).not.toContain('from "@/server/server"');
    expect(factories).not.toContain("const server = getServer()");
    expect(factories).toContain("registerToolsOnServer");
  });

  test("plugin uses unique install identity and does not report ready before HTTP bind", async () => {
    const [index, runtimeHost, tools, phaseControl, net] = await Promise.all([
      source("index.ts"),
      source("plugin/runtimeHost.ts"),
      source("server/tools.ts"),
      source("server/runtime/phaseControl.ts"),
      source("server/net.ts"),
    ]);

    const candidateCreated = runtimeHost.indexOf("const candidate = createNetServer(this.nativeHttp");
    const candidateOwned = runtimeHost.indexOf("this.httpServer = candidate;", candidateCreated);
    const listeningHook = runtimeHost.indexOf('server.once("listening"');
    const errorHook = runtimeHost.indexOf('server.once("error"');
    const bindCleanup = runtimeHost.indexOf("candidate.closeActiveSockets()", candidateCreated);
    const failedReturn = runtimeHost.indexOf("return false;", bindCleanup);
    const startCall = index.indexOf("if (!(await runtimeHost.start(generation))) return;");
    const readyUi = index.indexOf("blockbenchIntegration.setupUi(");

    expect(index).toContain('BBPlugin.register("blockit_mcp"');
    expect(index).toContain('author: "Halo Karya Media"');
    expect(index).toContain('repository: "https://github.com/MIVUBI-STD/M-LazyDesigner"');
    expect(index).toContain('bug_tracker: "https://github.com/MIVUBI-STD/M-LazyDesigner/issues"');
    expect(candidateCreated).toBeGreaterThan(-1);
    expect(candidateOwned).toBeGreaterThan(candidateCreated);
    expect(listeningHook).toBeGreaterThan(-1);
    expect(errorHook).toBeGreaterThan(-1);
    expect(bindCleanup).toBeGreaterThan(candidateCreated);
    expect(failedReturn).toBeGreaterThan(bindCleanup);
    expect(startCall).toBeGreaterThan(-1);
    expect(readyUi).toBeGreaterThan(startCall);

    expect(phaseControl).toMatch(/if \(!phaseSwitchHandler\).*throw/s);
    expect(phaseControl).toContain("requestMcpPhaseSwitch");
    expect(phaseControl).toContain("phaseSwitchHandler(phase)");
    expect(net).toContain("requestedAuthoringPhase === null");
    expect(net).toContain("requestMcpPhaseSwitch(envelope.targetAuthoringPhase)");
    expect(tools).not.toContain("surface_changed: true");
    expect(phaseControl).toContain("reload_required: false");
  });

  test("phase switching follows the canonical Runtime profile without shadowing listener config", async () => {
    const [index, runtimeHost] = await Promise.all([
      source("index.ts"),
      source("plugin/runtimeHost.ts"),
    ]);

    expect(index).toContain("const activeProfile = getActiveMcpRegistrationProfile();");
    expect(index).toContain("applyMcpToolSurface(activeProfile, targetPhase);");
    expect(index).not.toContain("applyMcpToolSurface(registrationProfile, targetPhase);");
    expect(index).not.toContain("runtimeHost.updateSurface(");
    expect(runtimeHost).not.toContain("updateSurface(");
    expect(runtimeHost).not.toContain("updateProfile(");
    expect(runtimeHost).not.toContain("updatePhase(");
    expect(runtimeHost).not.toContain("this.config.profile");
    expect(runtimeHost).not.toContain("this.config.phase");
  });

  test("Blockbench lifecycle callbacks stay synchronous while async teardown is coordinator-owned", async () => {
    const index = await source("index.ts");
    const lifecycle = await source("lib/runtimeLifecycle.ts");

    expect(index).toContain("onload() {");
    expect(index).toContain("onunload() {");
    expect(index).not.toContain("async onload() {");
    expect(index).not.toContain("async onunload() {");
    expect(index).toContain("claimRuntimeGeneration(currentBuildIdentity())");
    expect(index).toContain("beginBlockItRuntimeTeardown();");
    expect(index).toContain("initializationInProgress = null;");
    expect(lifecycle).toContain("priorTeardown");
    expect(lifecycle).toContain("beginRuntimeGenerationTeardown");
  });

  test("plugin unload detaches integration synchronously and drains listener ownership asynchronously", async () => {
    const [index, runtimeHost, integration, net, ui, status, settings] = await Promise.all([
      source("index.ts"),
      source("plugin/runtimeHost.ts"),
      source("plugin/blockbenchIntegration.ts"),
      source("server/net.ts"),
      source("ui/index.ts"),
      source("ui/statusBar.ts"),
      source("ui/settings.ts"),
    ]);

    const teardownStart = index.indexOf("function beginBlockItRuntimeTeardown");
    const integrationTeardown = index.indexOf("blockbenchIntegration.teardown();", teardownStart);
    const runtimeTeardown = index.indexOf("runtimeHost.teardown(generation);", teardownStart);
    expect(teardownStart).toBeGreaterThan(-1);
    expect(integrationTeardown).toBeGreaterThan(teardownStart);
    expect(runtimeTeardown).toBeGreaterThan(integrationTeardown);
    expect(integration).toContain("uiTeardown();");
    expect(integration).toContain("settingsTeardown();");
    expect(runtimeHost).toContain("const closePromise = current?.closeAndWait() ?? Promise.resolve();");
    expect(runtimeHost).toContain("beginRuntimeGenerationTeardown(generation");
    expect(net).toContain("activeSockets");
    expect(net).toContain("closeActiveSockets");
    expect(net).toContain("waitForRuntimeOperationDrain()");
    expect(net).toContain("ERR_SERVER_NOT_RUNNING");
    expect(ui).toContain("toolTestDialogTeardown()");
    expect(ui).toContain("promptPreviewDialogTeardown()");
    expect(ui).toContain("panelCssHandle?.delete()");
    expect(status).toContain("statusBarCssHandle?.delete()");
    expect(settings).toContain("settings.splice(0)");
  });

  test("native tool serialization survives listener replacement through the global coordinator", async () => {
    const net = await source("server/net.ts");
    const lifecycle = await source("lib/runtimeLifecycle.ts");

    expect(net).toContain("runRuntimeOperationExclusive(generation");
    expect(net).not.toContain("let runtimeRequestTail: Promise<void>");
    expect(lifecycle).toContain("operationTail: Promise<void>");
    expect(lifecycle).toContain("RuntimeGenerationRetiredError");
  });

  test("dead prompt CDN and stateless session settings are removed", async () => {
    const promptLoader = await source("lib/promptLoader.ts");
    const settings = await source("ui/settings.ts");
    const i18n = await source("ui/i18n.ts");

    expect(promptLoader).not.toContain("CDN_BASE_URL");
    expect(promptLoader).not.toContain("remoteManifest");
    expect(promptLoader).not.toContain("refreshFromCDN");
    expect(settings).not.toContain("mcp_prompt_cdn_enabled");
    expect(settings).not.toContain("mcp_instructions");
    expect(i18n).not.toContain("session_timeout");
    expect(i18n).not.toContain("sse_heartbeat");
    expect(i18n).not.toContain("connected_clients");
  });

  test("package/runtime metadata identify BlockIT while upstream attribution remains documentation", async () => {
    const pkg = JSON.parse(await source("package.json")) as {
      name: string;
      description: string;
      author: string;
      contributors?: string[];
    };
    const readme = await source("README.md");

    expect(pkg.name).toBe("blockit-bedrock-entity-mcp");
    expect(pkg.description).toContain("Minecraft Bedrock Entity");
    expect(pkg.author).toBe("Halo Karya Media");
    expect(pkg.contributors).toContain("Jason J. Gardner");
    expect(readme).toContain("upstream hosted plugin");
    expect(await Bun.file("server/types.ts").exists()).toBe(false);
  });
});
