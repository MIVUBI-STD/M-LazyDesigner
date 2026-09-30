import type { IMCPTool, IMCPPrompt, IMCPResource } from "@/types";
import type { McpRegistrationProfile } from "./registrationProfile";
import {
  getActiveMcpAuthoringPhase,
  type McpAuthoringPhase,
} from "./authoringPhase";

function sortedNames(values: Array<{ name: string }>): string[] {
  return values.map((value) => value.name).sort((a, b) => a.localeCompare(b));
}

export function createSurfaceManifest({
  profile,
  phase = getActiveMcpAuthoringPhase(),
  tools,
  resources,
  prompts,
}: {
  profile: McpRegistrationProfile;
  phase?: McpAuthoringPhase;
  tools: Record<string, IMCPTool>;
  resources: Record<string, IMCPResource>;
  prompts: Record<string, IMCPPrompt>;
}) {
  const toolCatalog = Object.values(tools);
  const exposedTools = toolCatalog.filter((tool) => tool.enabled);
  const disabledTools = toolCatalog.filter((tool) => !tool.enabled);
  const resourceCatalog = Object.values(resources);
  const promptCatalog = Object.values(prompts);
  const exposedPrompts = promptCatalog.filter((prompt) => prompt.enabled);
  const disabledPrompts = promptCatalog.filter((prompt) => !prompt.enabled);

  return {
    profile,
    authoring_phase: phase,
    tools: {
      exposed_count: exposedTools.length,
      disabled_count: disabledTools.length,
      catalog_count: toolCatalog.length,
      exposed: sortedNames(exposedTools),
      disabled: sortedNames(disabledTools),
    },
    resources: {
      exposed_count: resourceCatalog.length,
      disabled_count: 0,
      catalog_count: resourceCatalog.length,
      exposed: sortedNames(resourceCatalog),
      disabled: [],
    },
    prompts: {
      exposed_count: exposedPrompts.length,
      disabled_count: disabledPrompts.length,
      catalog_count: promptCatalog.length,
      exposed: sortedNames(exposedPrompts),
      disabled: sortedNames(disabledPrompts),
    },
  } as const;
}
