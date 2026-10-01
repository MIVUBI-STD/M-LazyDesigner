import { describe, expect, test } from "bun:test";
import { GatewayConnectionManager } from "./connectionManager";

describe("GatewayConnectionManager", () => {
  test("does not inflate backoff while remaining offline", () => {
    const manager = new GatewayConnectionManager();

    manager.beginProbe();
    const firstDelay = manager.markOffline();
    const first = manager.snapshot();

    const repeatedDelay = manager.markOffline();
    const repeated = manager.snapshot();

    expect(firstDelay).toBeGreaterThan(0);
    expect(repeatedDelay).toBeLessThanOrEqual(firstDelay);
    expect(repeated.reconnect.failures).toBe(first.reconnect.failures);
    expect(repeated.state).toBe("offline");
  });

  test("runtime availability clears reconnect cooldown immediately", () => {
    const manager = new GatewayConnectionManager();

    manager.beginProbe();
    manager.markOffline();
    expect(manager.snapshot().reconnect.failures).toBe(1);

    manager.markAvailable();

    const snapshot = manager.snapshot();
    expect(snapshot.state).toBe("probing");
    expect(snapshot.reconnect.failures).toBe(0);
    expect(snapshot.reconnect.retry_after_ms).toBe(0);
    expect(manager.canAttempt()).toBe(true);
  });

  test("successful connection resets reconnect cooldown", () => {
    const manager = new GatewayConnectionManager();

    manager.beginProbe();
    manager.markOffline();
    expect(manager.snapshot().reconnect.failures).toBe(1);

    manager.beginConnect();
    manager.markReady({ catalogRefreshed: true });

    const snapshot = manager.snapshot();
    expect(snapshot.state).toBe("ready");
    expect(snapshot.reconnect.failures).toBe(0);
    expect(snapshot.reconnect.retry_after_ms).toBe(0);
    expect(snapshot.catalog_refresh_count).toBe(1);
    expect(snapshot.reconnect_count).toBe(0);
  });

  test("later reconnect is counted once", () => {
    const manager = new GatewayConnectionManager();

    manager.beginConnect();
    manager.markReady({ catalogRefreshed: true });
    manager.markDegraded();
    manager.beginConnect();
    manager.markReady({ catalogRefreshed: true });

    const snapshot = manager.snapshot();
    expect(snapshot.state).toBe("ready");
    expect(snapshot.reconnect_count).toBe(1);
    expect(snapshot.catalog_refresh_count).toBe(2);
  });
});
