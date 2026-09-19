import { McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import { z } from "zod";

const TEST_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
const TEST_AUDIO_BASE64 =
  "UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAA=";

export function conformanceFixturesEnabled(): boolean {
  return (globalThis as { __LAZYDESIGNER_CONFORMANCE__?: unknown })
    .__LAZYDESIGNER_CONFORMANCE__ === true;
}

export function wireConformanceFixtures(server: McpServer): void {
  server.server.registerCapabilities({
    tools: { listChanged: true },
    resources: { listChanged: true },
    prompts: { listChanged: true },
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
    async (_args, extra: any) => {
      const progressToken = extra?._meta?.progressToken ?? 0;
      for (const progress of [0, 50, 100]) {
        await extra.sendNotification({
          method: "notifications/progress",
          params: { progressToken, progress, total: 100 },
        });
      }
      return {
        content: [{ type: "text" as const, text: String(progressToken) }],
      };
    }
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
