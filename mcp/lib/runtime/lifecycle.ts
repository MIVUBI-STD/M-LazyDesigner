export type RuntimeLifecycleState =
  | "stopped"
  | "starting"
  | "running"
  | "quiescing"
  | "failed";

type RuntimeLifecycleCoordinator = {
  version: 1;
  generationCounter: number;
  ownerGeneration: number | null;
  ownerBuildIdentity: string | null;
  state: RuntimeLifecycleState;
  operationTail: Promise<void>;
  teardownTail: Promise<void>;
};

const GLOBAL_LIFECYCLE_KEY = "__BLOCKIT_RUNTIME_LIFECYCLE_V1__";

type RuntimeLifecycleGlobal = typeof globalThis & {
  [GLOBAL_LIFECYCLE_KEY]?: RuntimeLifecycleCoordinator;
};

function getCoordinator(): RuntimeLifecycleCoordinator {
  const root = globalThis as RuntimeLifecycleGlobal;
  const existing = root[GLOBAL_LIFECYCLE_KEY];
  if (existing?.version === 1) return existing;

  const created: RuntimeLifecycleCoordinator = {
    version: 1,
    generationCounter: 0,
    ownerGeneration: null,
    ownerBuildIdentity: null,
    state: "stopped",
    operationTail: Promise.resolve(),
    teardownTail: Promise.resolve(),
  };
  root[GLOBAL_LIFECYCLE_KEY] = created;
  return created;
}

export class RuntimeGenerationRetiredError extends Error {
  constructor(readonly generation: number) {
    super(`BlockIT Runtime generation ${generation} is no longer active.`);
    this.name = "RuntimeGenerationRetiredError";
  }
}

export type RuntimeGenerationClaim = {
  generation: number;
  priorTeardown: Promise<void>;
};

/**
 * Claim the one active BlockIT plugin generation for this Blockbench window.
 * The returned priorTeardown is captured before ownership changes so a freshly
 * loaded bundle can wait for the previous listener cleanup without polling.
 */
export function claimRuntimeGeneration(
  buildIdentity: string | null
): RuntimeGenerationClaim {
  const coordinator = getCoordinator();
  const generation = coordinator.generationCounter + 1;
  const priorTeardown = coordinator.teardownTail;

  coordinator.generationCounter = generation;
  coordinator.ownerGeneration = generation;
  coordinator.ownerBuildIdentity = buildIdentity;
  coordinator.state = "starting";

  return { generation, priorTeardown };
}

export function isRuntimeGenerationCurrent(generation: number): boolean {
  return getCoordinator().ownerGeneration === generation;
}

export function markRuntimeGenerationState(
  generation: number,
  state: RuntimeLifecycleState
): void {
  const coordinator = getCoordinator();
  if (coordinator.ownerGeneration === generation) {
    coordinator.state = state;
  }
}

/**
 * Retire ownership synchronously, then serialize asynchronous teardown work.
 * Blockbench does not await plugin onunload(), so the next generation explicitly
 * awaits this coordinator-owned barrier instead.
 */
export function beginRuntimeGenerationTeardown(
  generation: number,
  cleanup: () => Promise<void>
): Promise<void> {
  const coordinator = getCoordinator();
  if (coordinator.ownerGeneration === generation) {
    coordinator.ownerGeneration = null;
    coordinator.ownerBuildIdentity = null;
    coordinator.state = "quiescing";
  }

  const previous = coordinator.teardownTail;
  const run = previous.catch(() => undefined).then(cleanup);
  coordinator.teardownTail = run.then(
    () => {
      if (coordinator.ownerGeneration === null) coordinator.state = "stopped";
    },
    () => {
      if (coordinator.ownerGeneration === null) coordinator.state = "failed";
    }
  );
  return run;
}

/**
 * Serialize native Blockbench tool execution across sockets and plugin reloads.
 * A queued request from a retired generation is rejected before it can mutate
 * the new generation's global Project/Cube/Texture/Animation state.
 */
export function runRuntimeOperationExclusive<T>(
  generation: number | null,
  operation: () => Promise<T>
): Promise<T> {
  const coordinator = getCoordinator();
  const execute = async (): Promise<T> => {
    if (
      generation !== null &&
      coordinator.ownerGeneration !== generation
    ) {
      throw new RuntimeGenerationRetiredError(generation);
    }
    const result = await operation();
    if (
      generation !== null &&
      coordinator.ownerGeneration !== generation
    ) {
      throw new RuntimeGenerationRetiredError(generation);
    }
    return result;
  };

  const run = coordinator.operationTail.then(execute, execute);
  coordinator.operationTail = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export function waitForRuntimeOperationDrain(): Promise<void> {
  return getCoordinator().operationTail;
}

export function getRuntimeLifecycleSnapshot(): {
  generation: number;
  owner_generation: number | null;
  build_identity: string | null;
  state: RuntimeLifecycleState;
} {
  const coordinator = getCoordinator();
  return {
    generation: coordinator.generationCounter,
    owner_generation: coordinator.ownerGeneration,
    build_identity: coordinator.ownerBuildIdentity,
    state: coordinator.state,
  };
}
