import { getCapabilityMetadata } from "../lib/capabilityMetadata";
import { resolveGatewayCapabilityEffects } from "./capabilities/effects";
import type { BlockitAuthoringPhaseAffinity } from "./runtime/projectAffinity";

export function capabilityNeedsPhaseSnapshot(capability: string): boolean {
  return getCapabilityMetadata(capability).effects.phaseAffinity === "update_from_result";
}

export function deriveControlReceipt(
  capability: string,
  structuredContent: unknown,
  succeeded: boolean,
  phaseBefore: BlockitAuthoringPhaseAffinity | null
) {
  const application = resolveGatewayCapabilityEffects(
    capability,
    structuredContent,
    phaseBefore
  );

  return {
    phaseBefore,
    phaseAfter:
      succeeded && application.effects.phaseAffinity === "update_from_result"
        ? application.authoringPhase
        : phaseBefore,
    projectUuid: succeeded ? application.projectUuid : null,
  };
}
