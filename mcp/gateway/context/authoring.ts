import {
  classifyMcpToolStageByName,
} from "../../lib/capabilities/authoringStage";

export type GatewayAuthoringDomain =
  | "GEOMETRY"
  | "TEXTURING"
  | "ANIMATION"
  | "CORE";

export const MODELLING_PATH =
  ".agents/skills/lazydesigner-modelling/SKILL.md";
export const TEXTURING_PATH =
  ".agents/skills/lazydesigner-texturing/SKILL.md";
export const ANIMATION_PATH =
  ".agents/skills/lazydesigner-animation/SKILL.md";

export function authoringDomainForCapability(
  capability: string
): GatewayAuthoringDomain {
  const stage = classifyMcpToolStageByName(capability);
  return stage === "geometry"
    ? "GEOMETRY"
    : stage === "texturing"
      ? "TEXTURING"
      : stage === "animation"
        ? "ANIMATION"
        : "CORE";
}
