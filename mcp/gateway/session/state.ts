import type { ControlExecutionState } from "../control/orchestration";
import {
  seedCapabilityFacts,
  type CapabilityFactState,
} from "../capabilities/graph";
import { gatewayOrchestrationRecoveryState } from "./orchestrationRecoveryState";

export class GatewaySessionState {
  private executionState: ControlExecutionState | null = null;
  private capabilityFacts: CapabilityFactState = seedCapabilityFacts({});
  private capabilityFactsProjectUuid: string | null = null;

  get facts(): CapabilityFactState {
    return this.capabilityFacts;
  }

  get projectUuid(): string | null {
    return this.capabilityFactsProjectUuid;
  }

  get controlExecutionState(): ControlExecutionState | null {
    return this.executionState;
  }

  set controlExecutionState(value: ControlExecutionState | null) {
    this.executionState = value;
  }

  onRuntimeGenerationChange(): void {
    gatewayOrchestrationRecoveryState.invalidateRuntimeGeneration();
    this.executionState = null;
    // Runtime restart invalidates observed facts until the next bound status
    // refresh. Keep the requested project UUID for safe backend rebind checks.
    this.capabilityFacts = seedCapabilityFacts({});
  }

  synchronizeProject(projectUuid: string | null): void {
    const orchestrationProjectChanged =
      gatewayOrchestrationRecoveryState.synchronizeProjectAffinity(projectUuid);
    if (orchestrationProjectChanged) {
      this.executionState = null;
    }

    if (projectUuid !== this.capabilityFactsProjectUuid) {
      this.capabilityFactsProjectUuid = projectUuid;
      this.capabilityFacts = seedCapabilityFacts({
        projectBound: projectUuid !== null,
      });
      return;
    }

    this.capabilityFacts = {
      ...this.capabilityFacts,
      ...seedCapabilityFacts({ projectBound: projectUuid !== null }),
    };
  }

  replaceFacts(facts: CapabilityFactState): void {
    this.capabilityFacts = facts;
  }
}
