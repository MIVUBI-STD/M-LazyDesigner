import { z } from "zod";
import {
  phaseTransitionReceipt,
  phaseTransitionReceiptSchema,
} from "@/lib/receipts/authorityTransition";
import { createTool } from "@/lib/factories";
import {
  getActiveMcpAuthoringPhase,
  getMcpRuntimeSurface,
  type McpAuthoringPhase,
} from "@/lib/capabilities/authoringPhase";
import {
  ANIMATION_HANDOFF_READINESS_RULE,
  animationHandoffReadinessSchema,
  summarizeAnimationHandoffReadiness,
} from "@/lib/authoring/authoringReadiness";

let phaseSwitchHandler:
  | ((phase: McpAuthoringPhase) => void)
  | undefined;

export function setMcpPhaseSwitchHandler(
  handler: (phase: McpAuthoringPhase) => void
): void {
  phaseSwitchHandler = handler;
}

export function requestMcpPhaseSwitch(phase: McpAuthoringPhase): void {
  if (!phaseSwitchHandler) {
    throw new Error("Runtime Stage/Surface switching is unavailable; reload LazyDesigner.");
  }
  phaseSwitchHandler(phase);
}

export const phaseControlOutputSchema = phaseTransitionReceiptSchema;

export const phaseControlToolDocs = {
  name: "switch_authoring_phase",
  description:
    `Changes the Authoring Stage in the same task. Geometry↔Texturing stays on the shared AUTHORING Runtime Surface; AUTHORING↔Animation is the only Runtime Surface handoff. ${ANIMATION_HANDOFF_READINESS_RULE}`,
  parameters: z.object({
    target_phase: z.enum(["geometry", "texturing", "animation"]),
    reason: z.string().min(1),
    resume_from: z.string().min(1),
    readiness: animationHandoffReadinessSchema.optional(),
  }).refine(value => value.target_phase !== "animation" || value.readiness !== undefined, {
    message:
      "Animation handoff requires user-approved or authorized-autonomous readiness, UV Layout PASS, and a saved checkpoint.",
    path: ["readiness"],
  }),
  status: "stable" as const,
};

export function registerPhaseControlTool(): void {
  createTool(
    "switch_authoring_phase",
    {
      ...phaseControlToolDocs,
      outputSchema: phaseControlOutputSchema,
      async execute({ target_phase, reason, resume_from, readiness }) {
        if (!phaseSwitchHandler) {
          throw new Error("Runtime Stage/Surface switching is unavailable; reload LazyDesigner.");
        }
        const previousPhase = getActiveMcpAuthoringPhase();
        const previousSurface = getMcpRuntimeSurface(previousPhase);
        const targetSurface = getMcpRuntimeSurface(target_phase);
        const surfaceChanged = previousSurface !== targetSurface;
        const readinessSummary = readiness
          ? summarizeAnimationHandoffReadiness(readiness)
          : null;

        // Apply the canonical Runtime surface/focus before returning the handoff
        // receipt. Gateway affinity follows this result; it does not own Runtime
        // tool exposure itself.
        requestMcpPhaseSwitch(target_phase);

        return {
          content: [
            {
              type: "text" as const,
              text: `MCP Authoring Stage switched to ${target_phase}; Runtime Surface is ${targetSurface}. Continue this task through Gateway.`,
            },
          ],
          structuredContent: phaseTransitionReceipt({
            phase: target_phase,
            runtime_surface: targetSurface,
            reason,
            resume_from,
            readiness,
            readiness_summary: readinessSummary,
            surface_changed: surfaceChanged,
            reload_required: false,
            action: surfaceChanged
              ? "continue through Gateway in the same task; Runtime surface changes automatically"
              : "continue through Gateway in the same task; shared AUTHORING surface is unchanged",
          }),
        };
      },
    },
    "stable",
    true
  );
}
