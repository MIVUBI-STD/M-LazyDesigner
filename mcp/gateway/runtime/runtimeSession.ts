import type { GatewayConnectionState } from "./reconnectPolicy";

export type RuntimeSessionSnapshot = {
  state: GatewayConnectionState;
  generation: number;
  reconnect_count: number;
  catalog_refresh_count: number;
  last_ready_at: string | null;
  last_transition_at: string;
};

/**
 * Process-local observability for the long-lived Gateway session. It carries no
 * authored Blockbench state and is safe to reset whenever the Gateway process
 * itself restarts.
 */
export class RuntimeSessionState {
  private state: GatewayConnectionState = "offline";
  private generation = 0;
  private reconnectCount = 0;
  private catalogRefreshCount = 0;
  private lastReadyAt: string | null = null;
  private lastTransitionAt = new Date().toISOString();

  transition(next: GatewayConnectionState): void {
    if (next === this.state) return;
    this.state = next;
    this.generation += 1;
    this.lastTransitionAt = new Date().toISOString();
    if (next === "ready") {
      this.lastReadyAt = this.lastTransitionAt;
    }
  }

  markReconnect(): void {
    this.reconnectCount += 1;
  }

  markCatalogRefresh(): void {
    this.catalogRefreshCount += 1;
  }

  hasBeenReady(): boolean {
    return this.lastReadyAt !== null;
  }

  snapshot(): RuntimeSessionSnapshot {
    return {
      state: this.state,
      generation: this.generation,
      reconnect_count: this.reconnectCount,
      catalog_refresh_count: this.catalogRefreshCount,
      last_ready_at: this.lastReadyAt,
      last_transition_at: this.lastTransitionAt,
    };
  }
}
