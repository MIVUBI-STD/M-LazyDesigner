import { describe, expect, test } from "bun:test";
import { ReconnectPolicy } from "./reconnectPolicy";

describe("ReconnectPolicy", () => {
  test("uses bounded exponential backoff and resets after success", () => {
    const policy = new ReconnectPolicy({
      minBackoffMs: 100,
      maxBackoffMs: 500,
      multiplier: 2,
    });

    expect(policy.canAttempt(1_000)).toBe(true);
    expect(policy.markFailure(1_000)).toBe(100);
    expect(policy.canAttempt(1_050)).toBe(false);
    expect(policy.retryAfterMs(1_050)).toBe(50);

    expect(policy.markFailure(1_100)).toBe(200);
    expect(policy.markFailure(1_300)).toBe(400);
    expect(policy.markFailure(1_700)).toBe(500);

    policy.markSuccess();
    expect(policy.canAttempt(1_700)).toBe(true);
    expect(policy.snapshot(1_700)).toEqual({
      failures: 0,
      retry_after_ms: 0,
    });
  });
});
