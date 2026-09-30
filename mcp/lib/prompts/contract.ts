import type { McpAuthoringPhase } from "@/lib/authoringPhase";

const AUTHORING_WORKFLOW_SECTIONS = [
  "Minimum Necessary Evidence",
  "Simple Rigid Fast Path",
  "Geometry / Visual Gate",
  "UV Layout",
  "Texture Atlas",
  "Texture Styling",
  "Texture Verify",
] as const;

export const BEDROCK_WORKFLOW_PHASE_SECTIONS: Record<
  McpAuthoringPhase,
  readonly string[]
> = {
  geometry: AUTHORING_WORKFLOW_SECTIONS,
  texturing: AUTHORING_WORKFLOW_SECTIONS,
  animation: ["Minimum Necessary Evidence"],
};

export const BEDROCK_WORKFLOW_REQUIRED_SECTIONS: readonly string[] = [
  ...new Set(Object.values(BEDROCK_WORKFLOW_PHASE_SECTIONS).flat()),
];

export function missingBedrockWorkflowSections(markdown: string): string[] {
  return BEDROCK_WORKFLOW_REQUIRED_SECTIONS.filter(
    (heading) => !markdown.includes(`## ${heading}`)
  );
}

export function assertBedrockWorkflowSourceCompatible(markdown: string): void {
  const missing = missingBedrockWorkflowSections(markdown);
  if (missing.length === 0) return;
  throw new Error(
    `Bedrock workflow is incompatible with authoring-stage routing; missing section(s): ${missing
      .map((heading) => `## ${heading}`)
      .join(", ")}. Reset the prompt override or restore the canonical section structure.`
  );
}
