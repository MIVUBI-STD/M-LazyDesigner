import { PRODUCT_ID } from "@/lib/productIdentity";
import { BLOCKIT_AUTHORING_PHASE_AFFINITY_HEADER } from "../gateway/projectAffinity";

export { DEFAULT_RUNTIME_URL as DEFAULT_MCP_URL } from "../lib/runtimeConnection";
import { DEFAULT_RUNTIME_URL as DEFAULT_MCP_URL } from "../lib/runtimeConnection";
import { runtimeFetch as fetch } from "../lib/runtimeFetch";
export const DEFAULT_BUNDLE_PATH = "dist/blockit_mcp.js";
export const EXPECTED_PROFILES = new Set(["bedrock_entity", "extended"]);
export const PROTOCOL_VERSION = "2025-06-18";
export const AUTHORING_E2E_PROJECT_NAME = "blockit_geometry_e2e_disposable";
export const AUTHORING_E2E_BONE_NAME = "e2e_root";
export const AUTHORING_E2E_CUBE_NAME = "e2e_body";
export const AUTHORING_E2E_ATLAS_NAME = "e2e_atlas";
export const AUTHORING_E2E_ANIMATION_A_NAME = "animation.blockit_e2e_motion_a";
export const AUTHORING_E2E_ANIMATION_B_NAME = "animation.blockit_e2e_motion_b";

const FORBIDDEN_LIVE_TOOLS = new Set(["risky_eval", "from_geo_json"]);

export type JsonObject = Record<string, unknown>;
export type ContentItem =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };
export type ToolCallPayload = {
  content?: ContentItem[];
  structuredContent?: unknown;
  isError?: boolean;
};
type RpcEnvelope = {
  result?: unknown;
  error?: { code?: number; message?: string; data?: unknown };
};
export type ToolCallKind =
  | "mutation"
  | "inspection"
  | "evidence"
  | "history"
  | "other";

type Metrics = {
  http_calls: number;
  rpc_calls: number;
  tool_calls: number;
  mutation_calls: number;
  inspection_calls: number;
  evidence_calls: number;
  history_calls: number;
  request_bytes: number;
  response_bytes: number;
};

export function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function requireDisposableConsent(args = process.argv.slice(2)): void {
  if (!args.includes("--confirm-disposable")) {
    throw new Error(
      "LIVE AUTHORING E2E REFUSED: pass --confirm-disposable. These verifiers intentionally mutate a disposable Blockbench project."
    );
  }
}

export function structuredObject(
  result: ToolCallPayload,
  toolName: string
): JsonObject {
  if (
    result.structuredContent &&
    typeof result.structuredContent === "object" &&
    !Array.isArray(result.structuredContent)
  ) {
    return result.structuredContent as JsonObject;
  }

  const text = result.content?.find(
    (item): item is Extract<ContentItem, { type: "text" }> => item.type === "text"
  )?.text;
  if (text) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as JsonObject;
      }
    } catch {
      // Compact human summaries are allowed when structuredContent owns state.
    }
  }

  throw new Error(`${toolName} returned no machine-readable object.`);
}

export function firstImage(result: ToolCallPayload, toolName: string) {
  const image = result.content?.find(
    (item): item is Extract<ContentItem, { type: "image" }> => item.type === "image"
  );
  expect(image, `${toolName} returned no MCP image content.`);
  expect(
    image.mimeType === "image/png",
    `${toolName} returned ${image.mimeType}, expected image/png.`
  );
  expect(image.data.length > 0, `${toolName} returned empty image data.`);
  return image;
}

export function imageDigest(image: Extract<ContentItem, { type: "image" }>): string {
  return new Bun.CryptoHasher("sha256").update(image.data).digest("hex");
}

export class LiveMcpClient {
  readonly targetUrl: string;
  readonly bundlePath: string;
  readonly expectedPhase: "geometry" | "texturing" | "animation";
  readonly requiredTools: readonly string[];

  private rpcId = 10;
  private readonly startedAt = performance.now();
  private readonly metrics: Metrics = {
    http_calls: 0,
    rpc_calls: 0,
    tool_calls: 0,
    mutation_calls: 0,
    inspection_calls: 0,
    evidence_calls: 0,
    history_calls: 0,
    request_bytes: 0,
    response_bytes: 0,
  };

  constructor(options: {
    expectedPhase: "geometry" | "texturing" | "animation";
    requiredTools: readonly string[];
    targetUrl?: string;
    bundlePath?: string;
  }) {
    this.expectedPhase = options.expectedPhase;
    this.requiredTools = options.requiredTools;
    this.targetUrl = (
      options.targetUrl ?? process.env.BLOCKIT_MCP_URL ?? DEFAULT_MCP_URL
    ).replace(/\/+$/, "");
    this.bundlePath =
      options.bundlePath ?? process.env.BLOCKIT_MCP_BUNDLE ?? DEFAULT_BUNDLE_PATH;
  }

  private async responseJson(response: Response): Promise<{
    text: string;
    envelope: RpcEnvelope;
  }> {
    const text = await response.text();
    this.metrics.response_bytes += new TextEncoder().encode(text).length;
    if (!text) return { text, envelope: {} };
    try {
      return { text, envelope: JSON.parse(text) as RpcEnvelope };
    } catch {
      throw new Error(
        `Expected JSON from BlockIT but received HTTP ${response.status}: ${text.slice(0, 400)}`
      );
    }
  }

  private async postRpc(
    method: string,
    params: JsonObject,
    protocolHeader = true
  ): Promise<RpcEnvelope> {
    const headers = new Headers({
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      connection: "close",
      [BLOCKIT_AUTHORING_PHASE_AFFINITY_HEADER]: this.expectedPhase,
    });
    if (protocolHeader) headers.set("mcp-protocol-version", PROTOCOL_VERSION);

    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: this.rpcId++,
      method,
      params,
    });
    this.metrics.http_calls += 1;
    this.metrics.rpc_calls += 1;
    this.metrics.request_bytes += new TextEncoder().encode(body).length;

    const response = await fetch(this.targetUrl, {
      method: "POST",
      headers,
      body,
    });
    const { text, envelope } = await this.responseJson(response);
    expect(
      response.status === 200,
      `${method} returned HTTP ${response.status}: ${JSON.stringify(envelope.error ?? text)}`
    );
    expect(
      envelope.error === undefined,
      `${method} returned JSON-RPC error: ${JSON.stringify(envelope.error)}`
    );
    return envelope;
  }

  private async localBuildIdentity(): Promise<string> {
    const file = Bun.file(this.bundlePath);
    expect(await file.exists(), `Missing ${this.bundlePath}. Build or deploy a verified CI artifact first.`);
    const match = (await file.text()).match(
      /globalThis\.__BLOCKIT_BUILD_ID__\s*=\s*["'](sha256:[a-f0-9]{64})["']/
    );
    expect(match?.[1], `${this.bundlePath} has no valid embedded build identity.`);
    return match[1];
  }

  private async healthJson(): Promise<JsonObject> {
    this.metrics.http_calls += 1;
    const response = await fetch(`${this.targetUrl}/health`, {
      headers: { connection: "close", [BLOCKIT_AUTHORING_PHASE_AFFINITY_HEADER]: this.expectedPhase },
    });
    const text = await response.text();
    this.metrics.response_bytes += new TextEncoder().encode(text).length;
    expect(response.status === 200, `BlockIT /health returned HTTP ${response.status}.`);
    try {
      const value = JSON.parse(text) as unknown;
      expect(value && typeof value === "object" && !Array.isArray(value), "BlockIT /health returned non-object JSON.");
      return value as JsonObject;
    } catch (error) {
      throw new Error(`BlockIT /health returned invalid JSON: ${String(error)}`);
    }
  }

  async preflight(): Promise<{ buildIdentity: string }> {
    const buildIdentity = await this.localBuildIdentity();
    const health = await this.healthJson();
    const product = (health.product ?? {}) as JsonObject;
    const transport = (health.transport ?? {}) as JsonObject;

    expect(product.id === PRODUCT_ID, `Wrong MCP product: ${String(product.id)}.`);
    expect(
      EXPECTED_PROFILES.has(String(product.profile)),
      `Expected a Geometry-capable profile; live=${String(product.profile)}.`
    );
    expect(
      product.authoring_phase === this.expectedPhase,
      `Expected ${this.expectedPhase} phase; live=${String(product.authoring_phase)}.`
    );
    expect(
      health.build_identity === buildIdentity,
      `Stale installed BlockIT build: local=${buildIdentity}; live=${String(health.build_identity)}.`
    );
    expect(
      transport.mode === "stateless" && transport.response_mode === "auto",
      "Live MCP transport is not the expected stateless auto-response contract."
    );
    expect(
      typeof health.instance_id === "string" && typeof health.startup_time === "string",
      "Live /health has no stable runtime instance_id/startup_time identity."
    );

    const secondHealth = await this.healthJson();
    expect(
      secondHealth.instance_id === health.instance_id &&
        secondHealth.startup_time === health.startup_time &&
        secondHealth.build_identity === health.build_identity,
      `BlockIT runtime process changed during preflight: first=${String(health.instance_id)}/${String(health.startup_time)} second=${String(secondHealth.instance_id)}/${String(secondHealth.startup_time)}.`
    );

    const initialize = await this.postRpc(
      "initialize",
      {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: {
          name: `blockit-${this.expectedPhase}-live-e2e`,
          version: "1.0.0",
        },
      },
      false
    );
    const initializeResult = (initialize.result ?? {}) as JsonObject;
    expect(
      initializeResult.protocolVersion === PROTOCOL_VERSION,
      `Unexpected MCP protocol ${String(initializeResult.protocolVersion)}.`
    );
    const instructions = initializeResult.instructions;
    expect(
      typeof instructions === "string" &&
        instructions.includes(`ACTIVE STAGE: ${this.expectedPhase.toUpperCase()}.`),
      `Initialize instructions do not prove active ${this.expectedPhase} ownership.`
    );

    const listed = await this.postRpc("tools/list", {});
    const listResult = (listed.result ?? {}) as {
      tools?: Array<{ name?: string }>;
    };
    const toolNames = (listResult.tools ?? [])
      .map((tool) => tool.name)
      .filter((name): name is string => typeof name === "string");
    const names = new Set(toolNames);
    expect(
      typeof health.exposed_tool_count === "number" &&
        health.exposed_tool_count === toolNames.length,
      `Live tools/list count differs from /health exposed_tool_count: health=${String(health.exposed_tool_count)} list=${toolNames.length}.`
    );
    for (const forbidden of FORBIDDEN_LIVE_TOOLS) {
      expect(!names.has(forbidden), `Forbidden live tool is exposed: ${forbidden}.`);
    }
    for (const required of this.requiredTools) {
      expect(names.has(required), `Live ${this.expectedPhase} surface is missing ${required}.`);
    }

    return { buildIdentity };
  }

  async callTool(
    name: string,
    toolArgs: JsonObject,
    kind: ToolCallKind = "other"
  ): Promise<ToolCallPayload> {
    this.metrics.tool_calls += 1;
    if (kind === "mutation") this.metrics.mutation_calls += 1;
    if (kind === "inspection") this.metrics.inspection_calls += 1;
    if (kind === "evidence") this.metrics.evidence_calls += 1;
    if (kind === "history") this.metrics.history_calls += 1;

    const envelope = await this.postRpc("tools/call", {
      name,
      arguments: toolArgs,
    });
    const result = (envelope.result ?? {}) as ToolCallPayload;
    expect(result.isError !== true, `${name} returned MCP isError=true: ${JSON.stringify(result.content)}`);
    return result;
  }

  snapshotMetrics() {
    return {
      ...this.metrics,
      elapsed_ms: Math.round(performance.now() - this.startedAt),
      measurement_basis:
        "One direct local MCP execution path; request/response bytes are serialized HTTP body bytes, not model tokens.",
    };
  }
}
