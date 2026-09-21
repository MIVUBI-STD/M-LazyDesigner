import {
  GatewayBackendError,
  type GatewayRuntimeStatus,
} from "./backendContract";

export class GatewayOperationQueue {
  private tail: Promise<void> = Promise.resolve();
  private pendingOperations = 0;
  private activeOperations = 0;
  private completedOperations = 0;
  private failedOperations = 0;
  private timedOutOperations = 0;
  private rejectedBusyOperations = 0;
  private lastQueueWaitMs: number | null = null;
  private maxQueueWaitMs = 0;
  private lastOperationDurationMs: number | null = null;
  private maxOperationDurationMs = 0;

  constructor(readonly maxQueueDepth: number) {}

  snapshot(): GatewayRuntimeStatus["operations"] {
    return {
      active: this.activeOperations,
      queued: Math.max(
        0,
        this.pendingOperations - this.activeOperations
      ),
      max_queue_depth: this.maxQueueDepth,
      completed: this.completedOperations,
      failed: this.failedOperations,
      timed_out: this.timedOutOperations,
      rejected_busy: this.rejectedBusyOperations,
      last_queue_wait_ms: this.lastQueueWaitMs,
      max_queue_wait_ms: this.maxQueueWaitMs,
      last_duration_ms: this.lastOperationDurationMs,
      max_duration_ms: this.maxOperationDurationMs,
    };
  }

  run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.pendingOperations >= this.maxQueueDepth + 1) {
      this.rejectedBusyOperations += 1;
      return Promise.reject(
        new GatewayBackendError(
          "GATEWAY_BUSY",
          `LazyDesigner Gateway queue is full (${this.maxQueueDepth} waiting operations maximum). Retry after the current authoring operation completes.`,
          true,
          { max_queue_depth: this.maxQueueDepth }
        )
      );
    }

    const enqueuedAt = Date.now();
    this.pendingOperations += 1;

    const execute = async (): Promise<T> => {
      const startedAt = Date.now();
      const queueWaitMs = Math.max(0, startedAt - enqueuedAt);
      this.lastQueueWaitMs = queueWaitMs;
      this.maxQueueWaitMs = Math.max(
        this.maxQueueWaitMs,
        queueWaitMs
      );
      this.activeOperations = 1;

      try {
        const result = await operation();
        this.completedOperations += 1;
        return result;
      } catch (error) {
        this.failedOperations += 1;
        if (
          error instanceof GatewayBackendError &&
          typeof error.details.timeout_ms === "number"
        ) {
          this.timedOutOperations += 1;
        }
        throw error;
      } finally {
        const durationMs = Math.max(0, Date.now() - startedAt);
        this.lastOperationDurationMs = durationMs;
        this.maxOperationDurationMs = Math.max(
          this.maxOperationDurationMs,
          durationMs
        );
        this.activeOperations = 0;
        this.pendingOperations = Math.max(
          0,
          this.pendingOperations - 1
        );
      }
    };

    const run = this.tail.then(execute, execute);
    this.tail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }
}
