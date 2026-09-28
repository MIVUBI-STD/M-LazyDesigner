import { VerificationEvidenceRegistry } from "@/lib/orchestration/evidenceRegistry";
import { CorrectionLoopRegistry } from "@/lib/orchestration/correctionLoop";

export class GatewayOrchestrationRecoveryState {
  readonly evidence = new VerificationEvidenceRegistry();
  readonly corrections = new CorrectionLoopRegistry();
  private invalidationCount = 0;

  invalidateRuntimeGeneration(): void {
    this.evidence.clear();
    this.corrections.invalidateRuntimeGeneration();
    this.invalidationCount += 1;
  }

  snapshot(): {
    invalidation_count: number;
    evidence_entries: number;
    correction_loops: number;
  } {
    return {
      invalidation_count: this.invalidationCount,
      evidence_entries: this.evidence.size(),
      correction_loops: this.corrections.size(),
    };
  }
}

export const gatewayOrchestrationRecoveryState =
  new GatewayOrchestrationRecoveryState();
