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
  /** Process-wide admission counter, retained across plugin reload generations. */
  pendingOperations?: number;
};

/** Native Blockbench state is process-global: one active operation plus bounded waiters. */
export const MAX_RUNTIME_WAITING_OPERATIONS = 16;

const GLOBAL_LIFECYCLE_KEY = "__BLOCKIT_RUNTIME_LIFECYCLE_V1__";

type RuntimeLifecycleGlobal = typeof globalThis & {
  [GLOBAL_LIFECYCLE_KEY]?: RuntimeLifecycleCoordinator;
};

function getCoordinator(): RuntimeLifecycleCoordinator {
  const root = globalThis as RuntimeLifecycleGlobal;
  const existing = root[GLOBAL_LIFECYCLE_KEY];
  if (existing?.version === 1) {
    // Upgrade a coordinator created by an older hot-reloaded plugin in place.
    if (existing.pendingOperations === undefined) existing.pendingOperations = 0;
    return existing;
  }

  const created: RuntimeLifecycleCoordinator = {
    version: 1,
    generationCounter: 0,
    ownerGeneration: null,
    ownerBuildIdentity: null,
    state: "stopped",
    operationTail: Promise.resolve(),
    teardownTail: Promise.resolve(),
    pendingOperations: 0,
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

export class RuntimeOperationQueueFullError extends Error {
  constructor() {
    super(`LazyDesigner Runtime is busy: ${MAX_RUNTIME_WAITING_OPERATIONS} native operations are already waiting. No new mutation was executed.`);
    this.name = "RuntimeOperationQueueFullError";
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
  // Admission happens synchronously before the operation is scheduled. A
  // second Gateway cannot bypass the first Gateway's private queue limit.
  if ((coordinator.pendingOperations ?? 0) >= MAX_RUNTIME_WAITING_OPERATIONS + 1) {
    return Promise.reject(new RuntimeOperationQueueFullError());
  }
  coordinator.pendingOperations = (coordinator.pendingOperations ?? 0) + 1;
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

  const run = coordinator.operationTail.then(execute, execute).finally(() => {
    coordinator.pendingOperations = Math.max(0, (coordinator.pendingOperations ?? 1) - 1);
  });
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
