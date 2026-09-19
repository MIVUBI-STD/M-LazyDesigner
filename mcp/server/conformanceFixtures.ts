import {
  acceptedContent,
  createRequestStateCodec,
  inputRequired,
  inputResponse,
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/server";
import { z } from "zod";

const TEST_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
const TEST_AUDIO_BASE64 =
  "UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAA=";

type ConformanceState =
  | { flow: "request-state" }
  | { flow: "multiple-inputs" }
  | { flow: "multi-round"; step: 1 | 2; name?: string }
  | { flow: "tampered-state" };

let requestStateCodec: ReturnType<typeof createRequestStateCodec<ConformanceState>> | null = null;

export function conformanceFixturesEnabled(): boolean {
  return (globalThis as { __LAZYDESIGNER_CONFORMANCE__?: unknown })
    .__LAZYDESIGNER_CONFORMANCE__ === true;
}

export function getConformanceRequestStateCodec() {
  if (!requestStateCodec) {
    requestStateCodec = createRequestStateCodec<ConformanceState>({
      key: "lazydesigner-conformance-state-key-2026",
      ttlSeconds: 600,
    });
  }
  return requestStateCodec;
}

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

const NAME_SCHEMA = {
  type: "object" as const,
  properties: { name: { type: "string" as const } },
  required: ["name"],
};
const CONFIRM_SCHEMA = {
  type: "object" as const,
  properties: { ok: { type: "boolean" as const } },
  required: ["ok"],
};

export function wireConformanceFixtures(server: McpServer): void {
  server.server.registerCapabilities({
    tools: { listChanged: false },
    resources: { listChanged: false, subscribe: false },
    prompts: { listChanged: false },
    completions: {},
  });

  server.registerTool(
    "test_simple_text",
    { description: "Tests simple text content response" },
    async () => ({
      content: [{ type: "text" as const, text: "This is a simple text response for testing." }],
    })
  );

  server.registerTool(
    "test_image_content",
    { description: "Tests image content response" },
    async () => ({
      content: [{ type: "image" as const, data: TEST_IMAGE_BASE64, mimeType: "image/png" }],
    })
  );

  server.registerTool(
    "test_audio_content",
    { description: "Tests audio content response" },
    async () => ({
      content: [{ type: "audio" as const, data: TEST_AUDIO_BASE64, mimeType: "audio/wav" }],
    }) as any
  );

  server.registerTool(
    "test_embedded_resource",
    { description: "Tests embedded resource content response" },
    async () => ({
      content: [{
        type: "resource" as const,
        resource: {
          uri: "test://embedded-resource",
          mimeType: "text/plain",
          text: "This is an embedded resource content.",
        },
      }],
    }) as any
  );

  server.registerTool(
    "test_multiple_content_types",
    { description: "Tests response with multiple content types" },
    async () => ({
      content: [
        { type: "text" as const, text: "Multiple content types test:" },
        { type: "image" as const, data: TEST_IMAGE_BASE64, mimeType: "image/png" },
        {
          type: "resource" as const,
          resource: {
            uri: "test://mixed-content-resource",
            mimeType: "application/json",
            text: JSON.stringify({ test: "data", value: 123 }),
          },
        },
      ],
    }) as any
  );

  server.registerTool(
    "test_error_handling",
    { description: "Tests error response handling" },
    async () => {
      throw new Error("This tool intentionally returns an error for testing");
    }
  );

  server.registerTool(
    "test_tool_with_progress",
    {
      description: "Tests progress notifications",
      inputSchema: {},
    },
    async (_args: Record<string, never>, ctx: any) => {
      const progressToken = ctx.mcpReq?._meta?.progressToken ?? 0;
      for (const progress of [0, 50, 100]) {
        await ctx.mcpReq.notify({
          method: "notifications/progress",
          params: { progressToken, progress, total: 100 },
        });
      }
      return textResult(String(progressToken));
    }
  );

  server.registerTool(
    "test_missing_capability",
    { description: "Requires sampling so missing capability is rejected by the SDK seam" },
    async () =>
      inputRequired({
        inputRequests: {
          sample: inputRequired.createMessage({
            messages: [{
              role: "user",
              content: { type: "text", text: "Capability probe" },
            }],
            maxTokens: 8,
          }),
        },
      })
  );

  server.registerTool(
    "test_streaming_elicitation",
    { description: "Diagnostic MRTR stream fixture" },
    async () =>
      inputRequired({
        inputRequests: {
          confirm: inputRequired.elicit({
            message: "Confirm stream test",
            requestedSchema: CONFIRM_SCHEMA,
          }),
        },
      })
  );

  server.registerTool(
    "test_logging_tool",
    { description: "Returns normally and emits no log unless explicitly implemented" },
    async () => textResult("logging fixture complete")
  );

  server.registerTool(
    "test_input_required_result_elicitation",
    { description: "MRTR elicitation fixture", inputSchema: {} },
    async (_args: Record<string, never>, ctx: any) => {
      const accepted = acceptedContent<{ name: string }>(
        ctx.mcpReq.inputResponses,
        "user_name"
      );
      if (accepted?.name) return textResult(`Hello, ${accepted.name}!`);
      return inputRequired({
        inputRequests: {
          user_name: inputRequired.elicit({
            message: "What is your name?",
            requestedSchema: NAME_SCHEMA,
          }),
        },
      });
    }
  );

  server.registerTool(
    "test_input_required_result_sampling",
    { description: "MRTR sampling fixture", inputSchema: {} },
    async (_args: Record<string, never>, ctx: any) => {
      const answer = inputResponse(ctx.mcpReq.inputResponses, "capital_question");
      if (answer.kind === "sampling") return textResult("sampling response accepted");
      return inputRequired({
        inputRequests: {
          capital_question: inputRequired.createMessage({
            messages: [{
              role: "user",
              content: { type: "text", text: "What is the capital of France?" },
            }],
            maxTokens: 100,
          }),
        },
      });
    }
  );

  server.registerTool(
    "test_input_required_result_list_roots",
    { description: "MRTR roots fixture", inputSchema: {} },
    async (_args: Record<string, never>, ctx: any) => {
      const roots = inputResponse(ctx.mcpReq.inputResponses, "client_roots");
      if (roots.kind === "roots") return textResult(`received ${roots.roots.length} root(s)`);
      return inputRequired({
        inputRequests: { client_roots: inputRequired.listRoots() },
      });
    }
  );

  server.registerTool(
    "test_input_required_result_request_state",
    { description: "MRTR requestState round-trip fixture", inputSchema: {} },
    async (_args: Record<string, never>, ctx: any) => {
      const codec = getConformanceRequestStateCodec();
      const state = (ctx.mcpReq.requestState() as ConformanceState | undefined);
      const response = acceptedContent<{ ok: boolean }>(
        ctx.mcpReq.inputResponses,
        "confirm"
      );
      if (state?.flow === "request-state" && response?.ok === true) {
        return textResult("state-ok");
      }
      return inputRequired({
        inputRequests: {
          confirm: inputRequired.elicit({
            message: "Please confirm",
            requestedSchema: CONFIRM_SCHEMA,
          }),
        },
        requestState: await codec.mint({ flow: "request-state" }),
      });
    }
  );

  server.registerTool(
    "test_input_required_result_multiple_inputs",
    { description: "MRTR multiple-input fixture", inputSchema: {} },
    async (_args: Record<string, never>, ctx: any) => {
      const codec = getConformanceRequestStateCodec();
      const user = inputResponse(ctx.mcpReq.inputResponses, "user_name");
      const greeting = inputResponse(ctx.mcpReq.inputResponses, "greeting");
      const roots = inputResponse(ctx.mcpReq.inputResponses, "client_roots");
      if (
        user.kind === "elicit" &&
        greeting.kind === "sampling" &&
        roots.kind === "roots"
      ) {
        return textResult("all inputs received");
      }
      return inputRequired({
        inputRequests: {
          user_name: inputRequired.elicit({
            message: "What is your name?",
            requestedSchema: NAME_SCHEMA,
          }),
          greeting: inputRequired.createMessage({
            messages: [{
              role: "user",
              content: { type: "text", text: "Generate a greeting" },
            }],
            maxTokens: 50,
          }),
          client_roots: inputRequired.listRoots(),
        },
        requestState: await codec.mint({ flow: "multiple-inputs" }),
      });
    }
  );

  server.registerTool(
    "test_input_required_result_multi_round",
    { description: "MRTR multi-round fixture", inputSchema: {} },
    async (_args: Record<string, never>, ctx: any) => {
      const codec = getConformanceRequestStateCodec();
      const state = (ctx.mcpReq.requestState() as ConformanceState | undefined);

      if (state?.flow === "multi-round" && state.step === 2) {
        const color = acceptedContent<{ color: string }>(
          ctx.mcpReq.inputResponses,
          "step2"
        );
        if (color?.color) {
          return textResult(`Hello ${state.name ?? "user"}; color=${color.color}`);
        }
      }

      if (state?.flow === "multi-round" && state.step === 1) {
        const name = acceptedContent<{ name: string }>(
          ctx.mcpReq.inputResponses,
          "step1"
        );
        if (name?.name) {
          return inputRequired({
            inputRequests: {
              step2: inputRequired.elicit({
                message: "Step 2: What is your favorite color?",
                requestedSchema: {
                  type: "object",
                  properties: { color: { type: "string" } },
                  required: ["color"],
                },
              }),
            },
            requestState: await codec.mint({
              flow: "multi-round",
              step: 2,
              name: name.name,
            }),
          });
        }
      }

      return inputRequired({
        inputRequests: {
          step1: inputRequired.elicit({
            message: "Step 1: What is your name?",
            requestedSchema: NAME_SCHEMA,
          }),
        },
        requestState: await codec.mint({ flow: "multi-round", step: 1 }),
      });
    }
  );

  server.registerTool(
    "test_input_required_result_tampered_state",
    { description: "MRTR tamper-detection fixture", inputSchema: {} },
    async (_args: Record<string, never>, ctx: any) => {
      const codec = getConformanceRequestStateCodec();
      const state = (ctx.mcpReq.requestState() as ConformanceState | undefined);
      const response = acceptedContent<{ ok: boolean }>(
        ctx.mcpReq.inputResponses,
        "confirm"
      );
      if (state?.flow === "tampered-state" && response?.ok === true) {
        return textResult("state-ok");
      }
      return inputRequired({
        inputRequests: {
          confirm: inputRequired.elicit({
            message: "Please confirm",
            requestedSchema: CONFIRM_SCHEMA,
          }),
        },
        requestState: await codec.mint({ flow: "tampered-state" }),
      });
    }
  );

  server.registerTool(
    "test_input_required_result_capabilities",
    { description: "MRTR client-capability filtering fixture", inputSchema: {} },
    async () =>
      inputRequired({
        inputRequests: {
          sampling_only: inputRequired.createMessage({
            messages: [{
              role: "user",
              content: { type: "text", text: "Capability-safe request" },
            }],
            maxTokens: 8,
          }),
        },
      })
  );

  server.registerResource(
    "static-text",
    "test://static-text",
    {
      title: "Static Text Resource",
      description: "A static text resource for testing",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [{
        uri: "test://static-text",
        mimeType: "text/plain",
        text: "This is the content of the static text resource.",
      }],
    })
  );

  server.registerResource(
    "static-binary",
    "test://static-binary",
    {
      title: "Static Binary Resource",
      description: "A static binary resource for testing",
      mimeType: "image/png",
    },
    async () => ({
      contents: [{
        uri: "test://static-binary",
        mimeType: "image/png",
        blob: TEST_IMAGE_BASE64,
      }],
    })
  );

  server.registerResource(
    "template",
    new ResourceTemplate("test://template/{id}/data", { list: undefined }),
    {
      title: "Resource Template",
      description: "A resource template with parameter substitution",
      mimeType: "application/json",
    },
    async (uri, variables) => ({
      contents: [{
        uri: uri.toString(),
        mimeType: "application/json",
        text: JSON.stringify({
          id: variables.id,
          templateTest: true,
          data: `Data for ID: ${variables.id}`,
        }),
      }],
    })
  );

  server.registerPrompt(
    "test_simple_prompt",
    {
      title: "Simple Test Prompt",
      description: "A simple prompt without arguments",
    },
    async () => ({
      messages: [{
        role: "user" as const,
        content: { type: "text" as const, text: "This is a simple prompt for testing." },
      }],
    })
  );

  server.registerPrompt(
    "test_prompt_with_arguments",
    {
      title: "Prompt With Arguments",
      description: "A prompt with required arguments",
      argsSchema: {
        arg1: z.string().describe("First test argument"),
        arg2: z.string().describe("Second test argument"),
      },
    },
    async (args) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Prompt with arguments: arg1='${args.arg1}', arg2='${args.arg2}'`,
        },
      }],
    })
  );

  server.registerPrompt(
    "test_prompt_with_embedded_resource",
    {
      title: "Prompt With Embedded Resource",
      description: "A prompt that includes an embedded resource",
      argsSchema: {
        resourceUri: z.string().describe("URI of the resource to embed"),
      },
    },
    async (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "resource" as const,
            resource: {
              uri: args.resourceUri,
              mimeType: "text/plain",
              text: "Embedded resource content for testing.",
            },
          },
        },
        {
          role: "user" as const,
          content: { type: "text" as const, text: "Please process the embedded resource above." },
        },
      ],
    }) as any
  );

  server.registerPrompt(
    "test_input_required_result_prompt",
    {
      title: "Input Required Prompt",
      description: "MRTR prompt that requires elicitation input",
      argsSchema: z.object({}),
    },
    async (_args: Record<string, never>, ctx: any) => {
      const accepted = acceptedContent<{ context: string }>(
        ctx.mcpReq.inputResponses,
        "user_context"
      );
      if (accepted?.context) {
        return {
          messages: [{
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Prompt with context: ${accepted.context}`,
            },
          }],
        };
      }
      return inputRequired({
        inputRequests: {
          user_context: inputRequired.elicit({
            message: "What context should the prompt use?",
            requestedSchema: {
              type: "object",
              properties: { context: { type: "string" } },
              required: ["context"],
            },
          }),
        },
      });
    }
  );

  server.registerPrompt(
    "test_prompt_with_image",
    {
      title: "Prompt With Image",
      description: "A prompt that includes image content",
    },
    async () => ({
      messages: [
        {
          role: "user" as const,
          content: { type: "image" as const, data: TEST_IMAGE_BASE64, mimeType: "image/png" },
        },
        {
          role: "user" as const,
          content: { type: "text" as const, text: "Please analyze the image above." },
        },
      ],
    }) as any
  );

  server.server.setRequestHandler("completion/complete", async () => ({
    completion: {
      values: [],
      total: 0,
      hasMore: false,
    },
  }));
}
