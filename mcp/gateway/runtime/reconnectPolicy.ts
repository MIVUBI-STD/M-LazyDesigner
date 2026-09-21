export type GatewayConnectionState =
  | "offline"
  | "probing"
  | "connecting"
  | "ready"
  | "degraded";

export type ReconnectPolicyOptions = {
  minBackoffMs?: number;
  maxBackoffMs?: number;
  multiplier?: number;
};

const DEFAULT_MIN_BACKOFF_MS = 250;
const DEFAULT_MAX_BACKOFF_MS = 5_000;
const DEFAULT_MULTIPLIER = 2;

function positiveNumber(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

/**
 * Small deterministic reconnect policy for the Gateway -> Runtime boundary.
 * The Gateway process itself stays alive; this policy only governs when a
 * failed backend connection may be attempted again.
 */
export class ReconnectPolicy {
  private readonly minBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly multiplier: number;
  private failures = 0;
  private retryAt = 0;

  constructor(options: ReconnectPolicyOptions = {}) {
    this.minBackoffMs = positiveNumber(
      options.minBackoffMs,
      DEFAULT_MIN_BACKOFF_MS
    );
    this.maxBackoffMs = Math.max(
      this.minBackoffMs,
      positiveNumber(options.maxBackoffMs, DEFAULT_MAX_BACKOFF_MS)
    );
    this.multiplier = Math.max(
      1,
      positiveNumber(options.multiplier, DEFAULT_MULTIPLIER)
    );
  }

  canAttempt(now: number = Date.now()): boolean {
    return now >= this.retryAt;
  }

  retryAfterMs(now: number = Date.now()): number {
    return Math.max(0, this.retryAt - now);
  }

  markSuccess(): void {
    this.failures = 0;
    this.retryAt = 0;
  }

  markFailure(now: number = Date.now()): number {
    this.failures += 1;
    const exponent = Math.max(0, this.failures - 1);
    const delay = Math.min(
      this.maxBackoffMs,
      Math.round(this.minBackoffMs * this.multiplier ** exponent)
    );
    this.retryAt = now + delay;
    return delay;
  }

  snapshot(now: number = Date.now()): {
    failures: number;
    retry_after_ms: number;
  } {
    return {
      failures: this.failures,
      retry_after_ms: this.retryAfterMs(now),
    };
  }
}
