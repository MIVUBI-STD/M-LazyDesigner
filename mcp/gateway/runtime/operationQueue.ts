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
  private expiredBeforeStart = 0;
  private cancelledBeforeStart = 0;
  private lastQueueWaitMs: number | null = null;
  private maxQueueWaitMs = 0;
  private lastOperationDurationMs: number | null = null;
  private maxOperationDurationMs = 0;

  constructor(
    readonly maxQueueDepth: number,
    readonly maxQueueWaitMs: number = 30_000
  ) {}

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
      expired_before_start: this.expiredBeforeStart,
      cancelled_before_start: this.cancelledBeforeStart,
      last_queue_wait_ms: this.lastQueueWaitMs,
      max_queue_wait_ms: this.maxQueueWaitMs,
      last_duration_ms: this.lastOperationDurationMs,
      max_duration_ms: this.maxOperationDurationMs,
    };
  }

  run<T>(
    operation: () => Promise<T>,
    options: { signal?: AbortSignal } = {}
  ): Promise<T> {
    if (options.signal?.aborted) {
      this.cancelledBeforeStart += 1;
      return Promise.reject(new GatewayBackendError(
        "GATEWAY_QUEUE_CANCELLED",
        "Gateway request was cancelled before native execution began.",
        true,
        { executed: false }
      ));
    }
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
    let started = false;
    let discarded = false;
    let deadline: ReturnType<typeof setTimeout> | null = null;
    let failWaiting!: (reason: unknown) => void;
    const waitingFailure = new Promise<never>((_resolve, reject) => {
      failWaiting = reject;
    });

    const cleanup = () => {
      if (deadline !== null) {
        clearTimeout(deadline);
        deadline = null;
      }
      options.signal?.removeEventListener("abort", onAbort);
    };
    const rejectBeforeStart = (code: "GATEWAY_QUEUE_EXPIRED" | "GATEWAY_QUEUE_CANCELLED") => {
      // Once execution begins, cancellation is uncertain. Never interrupt
      // or auto-replay an in-flight native mutation.
      if (started || discarded) return;
      discarded = true;
      const elapsedMs = Math.max(0, Date.now() - enqueuedAt);
      this.pendingOperations = Math.max(0, this.pendingOperations - 1);
      if (code === "GATEWAY_QUEUE_EXPIRED") this.expiredBeforeStart += 1;
      else this.cancelledBeforeStart += 1;
      cleanup();
      failWaiting(new GatewayBackendError(
        code,
        code === "GATEWAY_QUEUE_EXPIRED"
          ? "Gateway queue wait expired before native execution began."
          : "Gateway request was cancelled before native execution began.",
        true,
        {
          executed: false,
          queue_wait_ms: elapsedMs,
          ...(code === "GATEWAY_QUEUE_EXPIRED"
            ? { queue_wait_timeout_ms: this.maxQueueWaitMs }
            : {}),
        }
      ));
    };
    const onAbort = () => rejectBeforeStart("GATEWAY_QUEUE_CANCELLED");
    if (options.signal) {
      options.signal.addEventListener("abort", onAbort, { once: true });
      if (options.signal.aborted) onAbort();
    }
    if (!discarded && this.maxQueueWaitMs > 0) {
      deadline = setTimeout(
        () => rejectBeforeStart("GATEWAY_QUEUE_EXPIRED"),
        this.maxQueueWaitMs
      );
    }

    const execute = async (): Promise<T> => {
      if (discarded) {
        // The caller has already received a conclusive no-execution error.
        // Keep the existing serialization tail intact and skip this task.
        throw new Error("Discarded Gateway queue entry was never executed.");
      }
      started = true;
      cleanup();
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
    return Promise.race([run, waitingFailure]).finally(cleanup);
  }
}
