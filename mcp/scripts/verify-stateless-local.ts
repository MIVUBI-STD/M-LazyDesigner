export {};

import {
  getMcpSurfaceToolNames,
  registerMcpProfile,
} from "@/server/tools";
import {
  isMcpAuthoringPhase,
  type McpAuthoringPhase,
} from "@/lib/authoringPhase";
import type { McpRegistrationProfile } from "@/lib/registrationProfile";
import { PRODUCT_ID } from "@/lib/productIdentity";

import { DEFAULT_RUNTIME_URL as DEFAULT_MCP_URL } from "../lib/runtimeConnection";
import { runtimeFetch as fetch } from "../lib/runtimeFetch";
const DEFAULT_BUNDLE_PATH = "dist/blockit_mcp.js";
const EXPECTED_PROFILE: McpRegistrationProfile = "bedrock_entity";
const DEFAULT_PHASE: McpAuthoringPhase = "geometry";
const PROTOCOL_VERSION = "2025-06-18";

const FORBIDDEN_TOOLS = ["risky_eval", "from_geo_json"] as const;
const REQUIRED_GEOMETRY_TOOLS = [
  "create_project",
  "add_group",
  "manage_cubes",
  "modify_group",
  "reparent_element",
  "capture_model_views",
  "bone_rigging",
  "export_model",
] as const;
const PLAN_FREE_GEOMETRY_TOOLS = [
  "add_group",
  "manage_cubes",
  "modify_group",
  "reparent_element",
] as const;

type JsonObject = Record<string, unknown>;
type ListedTool = { name?: unknown; inputSchema?: unknown };
type Check = { name: string; ok: boolean; detail: string };

export type LocalSmokeDiagnosticCode =
  | "BLOCKBENCH_SERVER_UNREACHABLE"
  | "MCP_HEALTH_UNREADABLE"
  | "WRONG_MCP_PRODUCT"
  | "STALE_BUILD"
  | "SERVER_PROCESS_UNSTABLE"
  | "WRONG_AUTHORING_PHASE"
  | "MCP_HEALTH_CONTRACT_MISMATCH"
  | "MCP_INITIALIZE_CONTRACT_MISMATCH"
  | "SURFACE_MISMATCH"
  | "GEOMETRY_CAPABILITY_MISSING"
  | "RETIRED_PLAN_ID_EXPOSED";

const DIAGNOSTICS = {
  BLOCKBENCH_SERVER_UNREACHABLE: ["BLOCKBENCH_RUNTIME", "Start/reload BlockIT in desktop Blockbench and confirm the loopback endpoint."],
  MCP_HEALTH_UNREADABLE: ["ENVIRONMENT / INSTALL", "Confirm the loopback port belongs to BlockIT and /health returns HTTP 200 JSON."],
  WRONG_MCP_PRODUCT: ["ENVIRONMENT / INSTALL", "Close stale MCP owners and load only mcp/dist/blockit_mcp.js."],
  STALE_BUILD: ["ENVIRONMENT / INSTALL", "Reload the exact freshly built plugin; do not inspect tools/list until build_identity matches."],
  SERVER_PROCESS_UNSTABLE: ["BLOCKBENCH_RUNTIME", "Stabilize BlockIT/Blockbench so instance_id and startup_time remain unchanged."],
  WRONG_AUTHORING_PHASE: ["ENVIRONMENT / INSTALL", "Set the intended MCP Authoring Phase, reload BlockIT MCP, then reconnect."],
  MCP_HEALTH_CONTRACT_MISMATCH: ["MCP_PUBLIC_CONTRACT", "The fresh bundle is running but its health transport contract differs from source."],
  MCP_INITIALIZE_CONTRACT_MISMATCH: ["MCP_PUBLIC_CONTRACT", "The fresh bundle failed initialize semantics; inspect that contract owner first."],
  SURFACE_MISMATCH: ["MCP_PUBLIC_CONTRACT", "Capture missing/unexpected live tool names and fix only the first surface owner."],
  GEOMETRY_CAPABILITY_MISSING: ["MCP_PUBLIC_CONTRACT", "Fix the missing Geometry registration/surface owner before 3D-Assisted Evidence."],
  RETIRED_PLAN_ID_EXPOSED: ["MCP_PUBLIC_CONTRACT", "Fix the Direct Geometry schema owner before authoring."],
} as const satisfies Record<LocalSmokeDiagnosticCode, readonly [string, string]>;

export function getLocalSmokeDiagnostic(code: LocalSmokeDiagnosticCode) {
  const [classification, next] = DIAGNOSTICS[code];
  return {
    classification,
    next,
    stopBeforeSurface: ![
      "SURFACE_MISMATCH",
      "GEOMETRY_CAPABILITY_MISSING",
      "RETIRED_PLAN_ID_EXPOSED",
    ].includes(code),
  };
}

export function classifyPreflightFailure(state: {
  reachable: boolean;
  healthReadable?: boolean;
  productMatches?: boolean;
  buildMatches?: boolean;
  processStable?: boolean;
  phaseMatches?: boolean;
  transportMatches?: boolean;
}): LocalSmokeDiagnosticCode | null {
  if (!state.reachable) return "BLOCKBENCH_SERVER_UNREACHABLE";
  if (state.healthReadable === false) return "MCP_HEALTH_UNREADABLE";
  if (state.productMatches === false) return "WRONG_MCP_PRODUCT";
  if (state.buildMatches === false) return "STALE_BUILD";
  if (state.processStable === false) return "SERVER_PROCESS_UNSTABLE";
  if (state.phaseMatches === false) return "WRONG_AUTHORING_PHASE";
  if (state.transportMatches === false) return "MCP_HEALTH_CONTRACT_MISMATCH";
  return null;
}

const args = process.argv.slice(2);
const firstIsUrl = typeof args[0] === "string" && /^https?:\/\//i.test(args[0]);
const targetUrl = (
  (firstIsUrl ? args[0] : undefined) ||
  process.env.BLOCKIT_MCP_URL ||
  DEFAULT_MCP_URL
).replace(/\/+$/, "");
const phaseArg = firstIsUrl ? args[1] : args[0];
const bundlePath =
  (firstIsUrl ? args[2] : args[1]) ||
  process.env.BLOCKIT_MCP_BUNDLE ||
  DEFAULT_BUNDLE_PATH;
const checks: Check[] = [];

function record(name: string, ok: boolean, detail: string): void {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

function stop(code: LocalSmokeDiagnosticCode, name: string, detail: string): void {
  record(name, false, detail);
  const diagnostic = getLocalSmokeDiagnostic(code);
  console.log(`\nCODE: ${code}`);
  console.log(`CLASSIFICATION: ${diagnostic.classification}`);
  console.log(`NEXT: ${diagnostic.next}`);
  console.log(
    diagnostic.stopBeforeSurface
      ? "STOP. Do not inspect tools/list or modify MCP source from downstream symptoms."
      : "STOP. Preserve this exact live contract failure before changing source."
  );
  process.exitCode = 1;
}

function expectedPhase(): McpAuthoringPhase {
  const phase = phaseArg || process.env.BLOCKIT_EXPECTED_PHASE || DEFAULT_PHASE;
  if (!isMcpAuthoringPhase(phase)) {
    throw new Error(
      `Invalid expected phase "${String(phase)}". Use geometry, texturing, or animation.`
    );
  }
  return phase;
}

async function json(response: Response): Promise<JsonObject> {
  const text = await response.text();
  return text ? (JSON.parse(text) as JsonObject) : {};
}

async function localBuildIdentity(): Promise<string> {
  const file = Bun.file(bundlePath);
  if (!(await file.exists())) {
    throw new Error(`Missing ${bundlePath}. Run bun run build first.`);
  }
  const match = (await file.text()).match(
    /globalThis\.__BLOCKIT_BUILD_ID__\s*=\s*["'](sha256:[a-f0-9]{64})["']/
  );
  if (!match?.[1]) {
    throw new Error(`${bundlePath} has no valid embedded build identity.`);
  }
  return match[1];
}

function schemaPlanIssues(tools: ListedTool[]): string[] {
  const byName = new Map(
    tools
      .filter((tool): tool is ListedTool & { name: string } =>
        typeof tool.name === "string"
      )
      .map((tool) => [tool.name, tool])
  );
  const issues: string[] = [];

  for (const name of PLAN_FREE_GEOMETRY_TOOLS) {
    const schema = (byName.get(name)?.inputSchema ?? {}) as {
      required?: unknown;
      properties?: unknown;
    };
    const required = Array.isArray(schema.required) ? schema.required : [];
    const properties =
      schema.properties && typeof schema.properties === "object"
        ? (schema.properties as Record<string, unknown>)
        : {};

    if (!byName.has(name)) issues.push(`${name}:missing`);
    if (required.includes("plan_id")) issues.push(`${name}:plan_id_required`);
    if (Object.prototype.hasOwnProperty.call(properties, "plan_id")) {
      issues.push(`${name}:plan_id_exposed`);
    }
  }
  return issues;
}

async function post(body: unknown, protocol = false): Promise<Response> {
  const headers = new Headers({
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
    connection: "close",
  });
  if (protocol) headers.set("mcp-protocol-version", PROTOCOL_VERSION);

  return fetch(targetUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function fetchHealth(): Promise<{ response: Response; body: JsonObject }> {
  const response = await fetch(`${targetUrl}/health`, {
    headers: { connection: "close" },
  });
  return { response, body: await json(response) };
}

async function verify(): Promise<void> {
  let phase = expectedPhase();
  const buildIdentity = await localBuildIdentity();
  const preflight = { reachable: false } as Parameters<typeof classifyPreflightFailure>[0];

  registerMcpProfile(EXPECTED_PROFILE);
  let expectedNames = [...getMcpSurfaceToolNames(EXPECTED_PROFILE, phase)].sort();

  console.log(`BlockIT local diagnostic gate: ${targetUrl}`);
  console.log(
    `Expected product=${PRODUCT_ID}; profile=${EXPECTED_PROFILE}; phase=${phase}; tools=${expectedNames.length}`
  );
  console.log(`Expected bundle=${bundlePath}; build_identity=${buildIdentity}\n`);

  let healthResponse: Response;
  let health: JsonObject;
  try {
    ({ response: healthResponse, body: health } = await fetchHealth());
    preflight.reachable = true;
    record("server reachable", true, `HTTP ${healthResponse.status}`);
  } catch (error) {
    stop("BLOCKBENCH_SERVER_UNREACHABLE", "server reachable", String(error));
    return;
  }

  preflight.healthReadable = healthResponse.status === 200;
  let code = classifyPreflightFailure(preflight);
  if (code) {
    stop(code, "health readable", `HTTP ${healthResponse.status}`);
    return;
  }
  record("health readable", true, "HTTP 200 JSON");

  const product = (health.product ?? {}) as {
    id?: unknown;
    profile?: unknown;
    authoring_phase?: unknown;
  };
  if (!phaseArg && !process.env.BLOCKIT_EXPECTED_PHASE && isMcpAuthoringPhase(product.authoring_phase)) {
    phase = product.authoring_phase;
    expectedNames = [...getMcpSurfaceToolNames(EXPECTED_PROFILE, phase)].sort();
  }
  preflight.productMatches = product.id === PRODUCT_ID;
  code = classifyPreflightFailure(preflight);
  if (code) {
    stop(code, "product identity", `live=${String(product.id)}; expected=${PRODUCT_ID}`);
    return;
  }
  record("product identity", true, String(product.id));

  preflight.buildMatches = health.build_identity === buildIdentity;
  code = classifyPreflightFailure(preflight);
  if (code) {
    stop(
      code,
      "installed artifact freshness",
      `local=${buildIdentity}; live=${String(health.build_identity)}`
    );
    return;
  }
  record("installed artifact freshness", true, `build_identity=${buildIdentity}`);

  let secondHealth: JsonObject | null = null;
  try {
    const second = await fetchHealth();
    if (second.response.status === 200) secondHealth = second.body;
  } catch {
    secondHealth = null;
  }
  preflight.processStable =
    secondHealth !== null &&
    typeof health.instance_id === "string" &&
    typeof health.startup_time === "string" &&
    health.instance_id === secondHealth.instance_id &&
    health.startup_time === secondHealth.startup_time &&
    health.build_identity === secondHealth.build_identity;
  code = classifyPreflightFailure(preflight);
  if (code) {
    stop(
      code,
      "server process stability",
      `first=${String(health.instance_id)}/${String(health.startup_time)}; second=${String(
        secondHealth?.instance_id
      )}/${String(secondHealth?.startup_time)}`
    );
    return;
  }
  record(
    "server process stability",
    true,
    `instance_id=${String(health.instance_id)}; startup_time=${String(health.startup_time)}`
  );

  preflight.phaseMatches =
    product.profile === EXPECTED_PROFILE && product.authoring_phase === phase;
  code = classifyPreflightFailure(preflight);
  if (code) {
    stop(
      code,
      "installed profile / phase",
      `live=${String(product.profile)}/${String(product.authoring_phase)}; expected=${EXPECTED_PROFILE}/${phase}`
    );
    return;
  }
  record("installed profile / phase", true, `${String(product.profile)}/${String(product.authoring_phase)}`);

  const transport = health.transport as
    | { mode?: unknown; response_mode?: unknown }
    | undefined;
  preflight.transportMatches =
    transport?.mode === "stateless" && transport?.response_mode === "auto";
  code = classifyPreflightFailure(preflight);
  if (code) {
    stop(code, "health transport", JSON.stringify(transport ?? {}));
    return;
  }
  record("health transport", true, JSON.stringify(transport ?? {}));

  if (health.exposed_tool_count !== expectedNames.length) {
    stop(
      "SURFACE_MISMATCH",
      "health surface count",
      `live=${String(health.exposed_tool_count)}; expected=${expectedNames.length}`
    );
    return;
  }
  record("health surface count", true, `tools=${expectedNames.length}`);

  const initializeResponse = await post({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "blockit-local-smoke", version: "1.0.0" },
    },
  });
  const initialize = await json(initializeResponse);
  const initializeResult = initialize.result as
    | { protocolVersion?: unknown; instructions?: unknown }
    | undefined;
  const instructions =
    typeof initializeResult?.instructions === "string"
      ? initializeResult.instructions
      : "";
  const initializeOk =
    initializeResponse.status === 200 &&
    initializeResponse.headers.get("mcp-session-id") === null &&
    initializeResult?.protocolVersion === PROTOCOL_VERSION &&
    instructions.includes(`ACTIVE STAGE: ${phase.toUpperCase()}.`);
  if (!initializeOk) {
    stop(
      "MCP_INITIALIZE_CONTRACT_MISMATCH",
      "initialize / phase contract",
      `HTTP ${initializeResponse.status}; protocol=${String(
        initializeResult?.protocolVersion
      )}; session=${String(initializeResponse.headers.get("mcp-session-id"))}`
    );
    return;
  }
  record(
    "initialize / phase contract",
    true,
    `HTTP ${initializeResponse.status}; protocol=${String(initializeResult?.protocolVersion)}; session=none`
  );

  const listResponse = await post(
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    },
    true
  );
  const listed = await json(listResponse);
  const tools =
    ((listed.result as { tools?: ListedTool[] } | undefined)?.tools ?? []);
  const names = tools
    .map((tool) => tool.name)
    .filter((name): name is string => typeof name === "string")
    .sort();
  const missing = expectedNames.filter((name: string) => !names.includes(name));
  const unexpected = names.filter((name: string) => !expectedNames.includes(name));
  const forbidden = FORBIDDEN_TOOLS.filter((name) => names.includes(name));
  const surfaceOk =
    listResponse.status === 200 &&
    listResponse.headers.get("mcp-session-id") === null &&
    missing.length === 0 &&
    unexpected.length === 0 &&
    forbidden.length === 0;
  if (!surfaceOk) {
    stop(
      "SURFACE_MISMATCH",
      "tools/list exact source surface",
      `tools=${names.length}; missing=${missing.join(",") || "none"}; unexpected=${
        unexpected.join(",") || "none"
      }; forbidden=${forbidden.join(",") || "none"}`
    );
    return;
  }
  record(
    "tools/list exact source surface",
    true,
    `tools=${names.length}; missing=none; unexpected=none; forbidden=none`
  );

  if (phase === "geometry") {
    const requiredMissing = REQUIRED_GEOMETRY_TOOLS.filter(
      (name) => !names.includes(name)
    );
    if (requiredMissing.length > 0) {
      stop(
        "GEOMETRY_CAPABILITY_MISSING",
        "required Geometry capability",
        `missing=${requiredMissing.join(",")}`
      );
      return;
    }
    record("required Geometry capability", true, "missing=none");

    const planIssues = schemaPlanIssues(tools);
    if (planIssues.length > 0) {
      stop(
        "RETIRED_PLAN_ID_EXPOSED",
        "Direct Geometry plan-free schemas",
        `issues=${planIssues.join(",")}`
      );
      return;
    }
    record("Direct Geometry plan-free schemas", true, "issues=none");
  }

  console.log(`\nResult: ${checks.length}/${checks.length} passed.`);
  console.log("SERVER / BLOCKBENCH MCP: PASS");
  console.log("NEXT: Use Gateway search_capabilities in the same task to refresh and compare its Runtime catalog.");
  console.log(
    "Do not modify MCP source unless fresh Gateway/Runtime evidence identifies a real contract mismatch."
  );
}

if (import.meta.main) {
  try {
    await verify();
  } catch (error) {
    console.error("FAIL  diagnostic gate could not complete:", error);
    process.exitCode = 1;
  }
}
