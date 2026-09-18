import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { registerToolsOnServer } from "@/lib/factories";
import { DEFAULT_MCP_REGISTRATION_PROFILE } from "@/lib/registrationProfile";
import { getMcpSurfaceToolNames } from "@/server/tools";

describe("P1.4 stateless Streamable HTTP ownership", () => {
  test("default MCP request path is stateless JSON on the existing SDK line", async () => {
    const source = await readFile(
      new URL("../server/net.ts", import.meta.url),
      "utf8"
    );

    expect(source).toContain("sessionIdGenerator: undefined");
    expect(source).toContain("enableJsonResponse: true");
    expect(source).toContain("const requestServer = createMcpServer(");
    expect(source).toContain("registerToolsOnServer(requestServer, scopedToolNames)");
    expect(source).toContain("registerResourcesOnServer(requestServer)");
    expect(source).toContain("registerPromptsOnServer(requestServer)");
    expect(source).toContain("await requestServer.close()");

    expect(source).not.toContain("mcp-session-id");
    expect(source).not.toContain("sessionManager");
    expect(source).not.toContain("SessionTransports");
    expect(source).not.toContain("setPingCallback");
    expect(source).not.toContain("sseHeartbeat");
    expect(source).not.toContain("setKeepAlive(");
    expect(source).toContain("socket.setTimeout(SOCKET_IDLE_TIMEOUT_MS");
    expect(source).toContain("const result = routedMethod === 'tools/call'");
    expect(source).toContain("singleRequestHeader(request, 'mcp-method')");
    expect(source).toContain("singleRequestHeader(request, 'mcp-name')");
    expect(source).toContain("routing headers disagree with the JSON-RPC body");
    expect(source).toContain("RuntimeRequestAbandonedError");
    expect(source).toContain("request.aborted ||");
    expect(source).toContain("response.destroyed ||");
    expect(source).toContain("sendNodeResponse(");
    expect(source).toContain("result.body,");
    expect(source).toContain("true");
  });

  test("request-owned reconstruction reuses registration caches until a surface mutation", async () => {
    const [netSource, registrationSource, factoriesSource] = await Promise.all([
      readFile(new URL("../server/net.ts", import.meta.url), "utf8"),
      readFile(new URL("../server/runtime/registration.ts", import.meta.url), "utf8"),
      readFile(new URL("../lib/factories.ts", import.meta.url), "utf8"),
    ]);

    expect(netSource).not.toContain("invalidateToolRegistrationRuntimeCaches");
    expect(registrationSource).toContain("invalidateToolRegistrationRuntimeCaches()");
    expect(factoriesSource).toContain(
      "Invalidate only the phase/profile-sensitive tool surface"
    );
    expect(factoriesSource).toContain("Tool callbacks,");
    expect(factoriesSource).toContain("resources and prompts are generation-stable");
    expect(factoriesSource).toContain("getToolRegistrationEntries(");
  });

  test("Gateway phase affinity selects an existing surface without global tool mutation", async () => {
    const animationSurface = getMcpSurfaceToolNames(
      DEFAULT_MCP_REGISTRATION_PROFILE,
      "animation"
    );
    const authoringSurface = getMcpSurfaceToolNames(
      DEFAULT_MCP_REGISTRATION_PROFILE,
      "geometry"
    );
    const registered: string[] = [];

    registerToolsOnServer(
      {
        registerTool(name: string) {
          registered.push(name);
        },
      },
      animationSurface
    );

    expect(registered).toEqual([...animationSurface]);
    expect(animationSurface.length).toBeLessThan(authoringSurface.length);
    expect(animationSurface).toContain("switch_authoring_phase");
    expect(animationSurface).toContain("create_animation");
    expect(animationSurface).not.toContain("manage_cubes");

    const source = await readFile(
      new URL("../server/net.ts", import.meta.url),
      "utf8"
    );
    expect(source).toContain("BLOCKIT_AUTHORING_PHASE_AFFINITY_HEADER");
    expect(source).toContain("requestedAuthoringPhase !== null");
    expect(source).toContain("requestMcpPhaseSwitch(envelope.targetAuthoringPhase)");
  });

  test("standalone SSE and session DELETE are not offered by the default endpoint", async () => {
    const source = await readFile(
      new URL("../server/net.ts", import.meta.url),
      "utf8"
    );

    const methodGate = source.indexOf("if (method !== 'POST')");
    const methodNotAllowed = source.indexOf("405", methodGate);
    const statelessDispatch = source.indexOf(
      "handleStatelessMcpRequest(",
      methodGate
    );

    expect(methodGate).toBeGreaterThan(-1);
    expect(methodNotAllowed).toBeGreaterThan(methodGate);
    expect(statelessDispatch).toBeGreaterThan(methodNotAllowed);
    expect(source).toContain("allow: 'POST'");
  });

  test("health output no longer reports protocol sessions", async () => {
    const source = await readFile(
      new URL("../server/net.ts", import.meta.url),
      "utf8"
    );

    expect(source).toContain("mode: 'stateless'");
    expect(source).toContain("response_mode: 'json'");
    expect(source).not.toContain("sessions:");
  });

  test("RuntimeHost owns only the HTTP listener lifecycle, not protocol sessions", async () => {
    const [indexSource, runtimeHostSource, settingsSource] = await Promise.all([
      readFile(new URL("../index.ts", import.meta.url), "utf8"),
      readFile(new URL("../plugin/runtimeHost.ts", import.meta.url), "utf8"),
      readFile(new URL("../ui/settings.ts", import.meta.url), "utf8"),
    ]);

    for (const source of [indexSource, runtimeHostSource]) {
      expect(source).not.toContain('from "@/lib/sessions"');
      expect(source).not.toContain("SessionTransports");
      expect(source).not.toContain("sessionTransports");
      expect(source).not.toContain("mcp_session_timeout");
      expect(source).not.toContain("mcp_sse_heartbeat");
    }
    expect(indexSource).toContain("const runtimeHost = new RuntimeHost()");
    expect(indexSource).toContain("await runtimeHost.start(generation)");
    expect(runtimeHostSource).toContain("const candidate = createNetServer(this.nativeHttp, { ...config, generation })");
    expect(runtimeHostSource).not.toContain("profile:");
    expect(runtimeHostSource).not.toContain("phase:");
    expect(runtimeHostSource).not.toContain("updateProfile(");
    expect(runtimeHostSource).not.toContain("updatePhase(");
    expect(runtimeHostSource).not.toContain("updateSurface(");
    expect(runtimeHostSource).toContain("await this.waitForListening(candidate)");
    expect(runtimeHostSource).toContain("current?.closeAndWait()");

    expect(settingsSource).not.toContain("mcp_session_timeout");
    expect(settingsSource).not.toContain("mcp_sse_heartbeat");
  });

  test("human UI does not present stateless requests or AI registries as durable client state", async () => {
    const [uiSource, statusSource, templateSource] = await Promise.all([
      readFile(new URL("../ui/index.ts", import.meta.url), "utf8"),
      readFile(new URL("../ui/statusBar.ts", import.meta.url), "utf8"),
      readFile(new URL("../ui/panel.html", import.meta.url), "utf8"),
    ]);

    expect(uiSource).not.toContain("sessionManager");
    expect(uiSource).not.toContain("sessions:");
    expect(uiSource).not.toContain("createSurfaceManifest");
    expect(uiSource).toContain("void input.tools");
    expect(uiSource).toContain("void input.resources");
    expect(uiSource).toContain("void input.prompts");
    expect(uiSource).not.toContain("availableToolCount");

    expect(statusSource).not.toContain("sessionManager");
    expect(statusSource).not.toContain("server_one_client");
    expect(statusSource).not.toContain("server_clients");
    expect(statusSource).toContain('return "LazyDesigner Ready"');

    expect(templateSource).not.toContain("sessions.length");
    expect(templateSource).not.toContain("connected_clients");
    expect(templateSource).not.toContain("availableToolCount");
    expect(templateSource).not.toContain("Runtime endpoint");
    expect(templateSource).toContain("Current project");
    expect(templateSource).toContain("AI handles the technical authoring workflow in the background.");
  });

  test("Origin rejection still precedes stateless MCP server construction", async () => {
    const source = await readFile(
      new URL("../server/net.ts", import.meta.url),
      "utf8"
    );

    const originGuard = source.indexOf(
      "if (originHeader !== undefined && !isAllowedLocalOrigin(originHeader))"
    );
    const forbiddenResponse = source.indexOf("403", originGuard);
    const requestConstruction = source.indexOf(
      "const webRequest = new Request(requestUrl, {",
      originGuard
    );
    const statelessDispatch = source.indexOf(
      "handleStatelessMcpRequest(",
      originGuard
    );

    expect(originGuard).toBeGreaterThan(-1);
    expect(forbiddenResponse).toBeGreaterThan(originGuard);
    expect(requestConstruction).toBeGreaterThan(forbiddenResponse);
    expect(statelessDispatch).toBeGreaterThan(requestConstruction);
  });
});
