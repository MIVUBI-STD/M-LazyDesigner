import { createHash } from "node:crypto";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

type StaticComponent = {
  id: string;
  path: string;
  bytes: number;
  sha256: string;
};

const FILES = {
  root_agents: "../AGENTS.md",
  mcp_agents: "AGENTS.md",
  modelling_skill: "../.agents/skills/lazydesigner-modelling/SKILL.md",
  texturing_skill: "../.agents/skills/lazydesigner-texturing/SKILL.md",
  animation_skill: "../.agents/skills/lazydesigner-animation/SKILL.md",
  workflow_prompt: "prompts/bedrock_entity_workflow.md",
} as const;

function bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function component(id: string, path: string): Promise<StaticComponent> {
  const text = await Bun.file(path).text();
  return { id, path, bytes: bytes(text), sha256: sha(text) };
}

function extractGatewayInstructions(source: string): string {
  const start = source.indexOf("const GATEWAY_INSTRUCTIONS =");
  const end = source.indexOf("\n\ntype GatewayToolDefinition", start);
  if (start < 0 || end <= start) throw new Error("Gateway instructions block not found.");
  const block = source.slice(start, end);
  const match = block.match(/GATEWAY_INSTRUCTIONS\s*=\s*\n?\s*"([\s\S]*?)";/);
  if (!match) throw new Error("Gateway instructions literal is not statically measurable.");
  return JSON.parse(`"${match[1]!.replaceAll('"', '\\"')}"`);
}

function fingerprint(parts: Array<{ id: string; sha256: string }>): string {
  return createHash("sha256")
    .update(parts.map((part) => `${part.id}:${part.sha256}`).join("\n"))
    .digest("hex");
}

async function gatewaySurface() {
  const client = new Client(
    { name: "model-context-footprint", version: "1.0.0" },
    { versionNegotiation: { mode: { pin: "2026-07-28" } } }
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["run", "./gateway/index.ts"],
    cwd: process.cwd(),
  });
  try {
    await client.connect(transport);
    const listed = await client.listTools();
    const serialized = JSON.stringify(listed.tools);
    return {
      tool_count: listed.tools.length,
      bytes: bytes(serialized),
      sha256: sha(serialized),
    };
  } finally {
    await client.close();
  }
}

export async function measureModelContextFootprint() {
  const entries = await Promise.all(
    Object.entries(FILES).map(([id, path]) => component(id, path))
  );
  const byId = Object.fromEntries(entries.map((entry) => [entry.id, entry]));
  const gatewaySource = await Bun.file("gateway/index.ts").text();
  const gatewayInstructions = extractGatewayInstructions(gatewaySource);
  const gatewayInstructionsComponent = {
    id: "gateway_instructions",
    path: "gateway/index.ts#GATEWAY_INSTRUCTIONS",
    bytes: bytes(gatewayInstructions),
    sha256: sha(gatewayInstructions),
  };
  const tools = await gatewaySurface();
  const toolComponent = {
    id: "gateway_tools",
    path: "Gateway tools/list",
    bytes: tools.bytes,
    sha256: tools.sha256,
  };

  const common = [
    byId.root_agents,
    byId.mcp_agents,
    gatewayInstructionsComponent,
    toolComponent,
  ];
  const taskClasses = {
    system_development: common,
    geometry_authoring: [...common, byId.modelling_skill],
    texturing_authoring: [...common, byId.texturing_skill],
    animation_authoring: [...common, byId.animation_skill],
  };

  const taskClassReport = Object.fromEntries(
    Object.entries(taskClasses).map(([name, parts]) => [
      name,
      {
        bytes: parts.reduce((sum, part) => sum + part.bytes, 0),
        component_ids: parts.map((part) => part.id),
        stable_prefix_candidate_sha256: fingerprint(parts),
      },
    ])
  );

  return {
    schema: 1,
    proof_scope:
      "REMOTE_GITHUB static repo-owned context footprint only; not actual Codex prompt assembly, cache hit proof, or token usage.",
    components: [...entries, gatewayInstructionsComponent, toolComponent],
    task_classes: taskClassReport,
    dynamic_tail_excluded: [
      "user/task messages",
      "Control stage_context",
      "current_user_delta",
      "tool results/history",
      "reference images",
      "model reasoning/output",
    ],
    cache_note:
      "Fingerprints detect repo-owned stable-prefix churn. Actual cache reuse must be measured from client/provider telemetry.",
  };
}

if (import.meta.main) {
  console.log(JSON.stringify(await measureModelContextFootprint(), null, 2));
}
