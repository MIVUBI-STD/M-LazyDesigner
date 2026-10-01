import type { ControlExecutionState } from "../control";
import {
  seedCapabilityFacts,
  type CapabilityFactState,
} from "../capabilities/graph";
import { gatewayOrchestrationRecoveryState } from "../execution/orchestrationRecoveryState";

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
    this.capabilityFacts = seedCapabilityFacts({
      projectBound: this.capabilityFactsProjectUuid !== null,
    });
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
