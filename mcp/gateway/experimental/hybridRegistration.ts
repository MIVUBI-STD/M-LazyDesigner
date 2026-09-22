import { fromJsonSchema, type McpServer } from "@modelcontextprotocol/server";
import type { JsonRecord } from "../protocol";
import {
  HYBRID_4_EXPERIMENTAL_DIRECT_CAPABILITIES,
  type GatewaySurfaceProfile,
} from "./hybridProfile";
import { HYBRID_4_GENERATED_SCHEMAS } from "./generated/hybrid4Schemas";

export type Hybrid4InvokeHandler = (
  capability: string,
  args: JsonRecord,
  context?: unknown
) => Promise<unknown>;

export function registerExperimentalHybrid4(input: {
  server: McpServer;
  profile: GatewaySurfaceProfile;
  invoke: Hybrid4InvokeHandler;
}): string[] {
  if (input.profile !== "hybrid_4_experimental") return [];

  const registered: string[] = [];
  for (const capability of HYBRID_4_EXPERIMENTAL_DIRECT_CAPABILITIES) {
    const spec = HYBRID_4_GENERATED_SCHEMAS[capability];
    input.server.registerTool(
      capability,
      {
        title: `Experimental direct: ${capability}`,
        description:
          `${spec.description} Experimental Hybrid-4 direct projection; execution still uses the canonical Gateway invoke/control path.`,
        inputSchema: fromJsonSchema(spec.inputSchema as any),
        annotations: spec.annotations,
      },
      async (args: unknown, context: unknown) =>
        input.invoke(
          capability,
          (args && typeof args === "object" && !Array.isArray(args)
            ? args
            : {}) as JsonRecord,
          context
        )
    );
    registered.push(capability);
  }

  return registered;
}
