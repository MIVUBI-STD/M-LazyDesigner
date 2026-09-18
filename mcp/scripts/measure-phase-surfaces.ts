import { createServer as createHttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import {
  applyMcpToolSurface,
  getMcpSurfaceToolNames,
} from "@/server/tools";
import createNetServer from "@/server/net";
import { DEFAULT_MCP_REGISTRATION_PROFILE } from "@/lib/registrationProfile";
import {
  MCP_AUTHORING_PHASES,
  type McpAuthoringPhase,
} from "@/lib/authoringPhase";

const HOST = "127.0.0.1";
const ENDPOINT = "/bb-mcp";
const PROTOCOL_VERSION = "2025-06-18";
const CATALOG_TOOL_COUNT = 54;

const EXPECTED_PHASE_TOOL_COUNTS: Record<McpAuthoringPhase, number> = {
  geometry: 47,
  texturing: 47,
  // Animation intentionally excludes create_project plus editor-selection helpers;
  // project lifecycle and Cube/Group selection belong to AUTHORING before the
  // approved handoff into the Animation surface.
  animation: 18,
};

type ListedTool = {
  name?: string;
  description?: string;
  inputSchema?: unknown;
  [key: string]: unknown;
};

type JsonRpcBody = {
  result?: {
    protocolVersion?: string;
    instructions?: string;
    tools?: ListedTool[];
  };
  error?: { message?: string };
};

type ToolRow = {
  name: string;
  payload_chars: number;
  input_schema_chars: number;
  description_chars: number;
};

type PhaseMetrics = {
  tool_count: number;
  phase_owned_tool_count: number;
  initialize_instructions_chars: number;
  tools_list_response_chars: number;
  tools_array_chars: number;
  input_schema_chars: number;
  description_chars: number;
  average_tool_payload_chars: number;
  per_tool_payload_chars: {
    p50: number;
    p90: number;
    p95: number;
    max: number;
  };
  largest_tools: ToolRow[];
};

type MeasuredPhase = {
  metrics: Omit<PhaseMetrics, "phase_owned_tool_count">;
  tool_names: string[];
};

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(fraction * sorted.length) - 1);
  return sorted[index] ?? 0;
}

async function postMcp(
  baseUrl: string,
  body: unknown,
  protocolVersion = false
): Promise<{ response: Response; text: string; json: JsonRpcBody }> {
  const headers = new Headers({
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
    connection: "close",
  });
  if (protocolVersion) {
    headers.set("mcp-protocol-version", PROTOCOL_VERSION);
  }

  const response = await fetch(`${baseUrl}${ENDPOINT}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const json = JSON.parse(text) as JsonRpcBody;
  return { response, text, json };
}

async function measurePhase(phase: McpAuthoringPhase): Promise<MeasuredPhase> {
  applyMcpToolSurface(DEFAULT_MCP_REGISTRATION_PROFILE, phase);
  const expectedNames = getMcpSurfaceToolNames(
    DEFAULT_MCP_REGISTRATION_PROFILE,
    phase
  );

  if (expectedNames.length !== EXPECTED_PHASE_TOOL_COUNTS[phase]) {
    throw new Error(
      `${phase} source surface exposes ${expectedNames.length} tools; expected ${EXPECTED_PHASE_TOOL_COUNTS[phase]}.`
    );
  }

  const server = createNetServer(
    { createServer: (options, callback) => createHttpServer(options, callback) },
    {
      port: 0,
      endpoint: ENDPOINT,
      host: HOST,
    }
  );

  try {
    if (!server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
      });
    }

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error(`Expected an IPv4 listener while measuring ${phase}.`);
    }
    const tcpAddress = address as AddressInfo;
    const baseUrl = `http://${HOST}:${tcpAddress.port}`;

    const initialized = await postMcp(baseUrl, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: {
          name: `blockit-${phase}-surface-measurement`,
          version: "1.0.0",
        },
      },
    });
    if (initialized.response.status !== 200) {
      throw new Error(
        `${phase} initialize failed (${initialized.response.status}): ${initialized.text}`
      );
    }
    if (initialized.json.result?.protocolVersion !== PROTOCOL_VERSION) {
      throw new Error(
        `${phase} returned unexpected protocol version ${initialized.json.result?.protocolVersion ?? "missing"}.`
      );
    }
    const instructions = initialized.json.result?.instructions ?? "";
    if (!instructions.includes(`ACTIVE STAGE: ${phase.toUpperCase()}`)) {
      throw new Error(`${phase} initialize lost its active-stage contract.`);
    }

    const listed = await postMcp(
      baseUrl,
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      },
      true
    );
    if (listed.response.status !== 200 || listed.json.error) {
      throw new Error(
        `${phase} tools/list failed: ${listed.json.error?.message ?? listed.text}`
      );
    }

    const tools = listed.json.result?.tools ?? [];
    const actualNames = tools
      .map((tool) => tool.name ?? "<unnamed>")
      .sort((a, b) => a.localeCompare(b));
    const expectedSorted = [...expectedNames].sort((a, b) => a.localeCompare(b));
    if (JSON.stringify(actualNames) !== JSON.stringify(expectedSorted)) {
      throw new Error(
        `${phase} runtime tools/list diverged from the source-owned phase surface.`
      );
    }

    const rows = tools.map((tool): ToolRow => ({
      name: tool.name ?? "<unnamed>",
      payload_chars: JSON.stringify(tool).length,
      input_schema_chars: JSON.stringify(tool.inputSchema ?? {}).length,
      description_chars: tool.description?.length ?? 0,
    }));
    const payloadSizes = rows.map((row) => row.payload_chars);
    const totalPayload = payloadSizes.reduce((sum, value) => sum + value, 0);

    return {
      tool_names: actualNames,
      metrics: {
        tool_count: tools.length,
        initialize_instructions_chars: instructions.length,
        tools_list_response_chars: listed.text.length,
        tools_array_chars: JSON.stringify(tools).length,
        input_schema_chars: rows.reduce(
          (sum, row) => sum + row.input_schema_chars,
          0
        ),
        description_chars: rows.reduce(
          (sum, row) => sum + row.description_chars,
          0
        ),
        average_tool_payload_chars:
          rows.length > 0 ? Math.round(totalPayload / rows.length) : 0,
        per_tool_payload_chars: {
          p50: percentile(payloadSizes, 0.5),
          p90: percentile(payloadSizes, 0.9),
          p95: percentile(payloadSizes, 0.95),
          max: payloadSizes.length > 0 ? Math.max(...payloadSizes) : 0,
        },
        largest_tools: [...rows]
          .sort(
            (a, b) =>
              b.payload_chars - a.payload_chars || a.name.localeCompare(b.name)
          )
          .slice(0, 8),
      },
    };
  } finally {
    server.closeActiveSockets();
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  }
}

async function main(): Promise<void> {
  const measured = {} as Record<McpAuthoringPhase, MeasuredPhase>;
  for (const phase of MCP_AUTHORING_PHASES) {
    measured[phase] = await measurePhase(phase);
  }

  const phaseSets = MCP_AUTHORING_PHASES.map(
    (phase) => new Set(measured[phase].tool_names)
  );
  const sharedAllPhaseTools = [...phaseSets[0]].filter((name) =>
    phaseSets.slice(1).every((set) => set.has(name))
  );
  const union = new Set(
    MCP_AUTHORING_PHASES.flatMap((phase) => measured[phase].tool_names)
  );
  if (union.size !== CATALOG_TOOL_COUNT) {
    throw new Error(
      `Phase union exposes ${union.size} unique tools; expected the ${CATALOG_TOOL_COUNT}-tool callable catalog.`
    );
  }

  const phases = Object.fromEntries(
    MCP_AUTHORING_PHASES.map((phase) => {
      const metrics: PhaseMetrics = {
        ...measured[phase].metrics,
        phase_owned_tool_count:
          measured[phase].metrics.tool_count - sharedAllPhaseTools.length,
      };
      return [phase, metrics];
    })
  ) as Record<McpAuthoringPhase, PhaseMetrics>;

  const heaviestPhase = [...MCP_AUTHORING_PHASES].sort(
    (a, b) =>
      phases[b].tools_list_response_chars - phases[a].tools_list_response_chars
  )[0];

  console.log(
    JSON.stringify(
      {
        protocol_version: PROTOCOL_VERSION,
        callable_catalog_tool_count: CATALOG_TOOL_COUNT,
        shared_core_tool_count: sharedAllPhaseTools.length,
        shared_core_tools: sharedAllPhaseTools.sort((a, b) => a.localeCompare(b)),
        heaviest_phase_by_tools_list_chars: heaviestPhase,
        phases,
        proof_note:
          "Measures source-owned phase-filtered MCP tools/list over the real loopback transport; it is not installed-client token usage or Authoring Efficiency proof.",
      },
      null,
      2
    )
  );
}

await main();
