<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { onMount } from 'svelte';

  type Compatibility = {
    status: 'validated' | 'compatible-unverified' | 'review-required' | 'unsupported' | 'invalid';
    minimum_version: string;
    review_boundary_version: string;
    source_type_baseline: string;
    live_validated: boolean;
  };

  type BlockbenchState = {
    running: boolean;
    version: string | null;
    compatibility: Compatibility | null;
    diagnostic: string | null;
  };

  type ManagedStatus = {
    schema?: number;
    installed?: { source_sha?: string } | null;
    pending?: boolean;
    gateway_active?: boolean;
    runtime_online?: boolean;
  };

  type GatewaySupervision = {
    ownership: 'client-owned';
    state: 'healthy' | 'waiting-runtime' | 'client-disconnected' | 'runtime-offline' | 'idle';
    action: string | null;
  };

  type SystemStatus = {
    schema: number;
    blockbench: BlockbenchState;
    gateway: GatewaySupervision;
    manager_available: boolean;
    managed: ManagedStatus | null;
    diagnostic: string | null;
  };

  type ManagedActionResult = {
    action: 'update' | 'recover';
    receipt: Record<string, unknown>;
  };

  let status: SystemStatus | null = null;
  let loading = true;
  let error = '';
  let busyAction: 'update' | 'recover' | null = null;
  let actionMessage = '';

  async function refresh() {
    loading = true;
    error = '';
    try {
      status = await invoke<SystemStatus>('system_status');
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      loading = false;
    }
  }

  async function runManagedAction(action: 'update' | 'recover') {
    if (!status?.manager_available || busyAction) return;
    busyAction = action;
    error = '';
    actionMessage = '';
    try {
      const result = await invoke<ManagedActionResult>('managed_action', { action });
      const receiptStatus = typeof result.receipt.status === 'string' ? result.receipt.status : 'COMPLETE';
      actionMessage = `${action === 'update' ? 'Update' : 'Recovery'}: ${receiptStatus}`;
      await refresh();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    } finally {
      busyAction = null;
    }
  }

  onMount(() => {
    void refresh();
  });

  const yesNo = (value: boolean | undefined) => value ? 'Online' : 'Offline';
  const compatibilityLabel = (value: Compatibility['status'] | undefined) => {
    if (value === 'validated') return 'Validated';
    if (value === 'compatible-unverified') return 'Compatible · unverified';
    if (value === 'review-required') return 'Review required';
    if (value === 'unsupported') return 'Unsupported';
    if (value === 'invalid') return 'Unknown version';
    return 'Unavailable';
  };
</script>

<main class="shell">
  <header>
    <div>
      <span class="eyebrow">Desktop Control Plane</span>
      <h1>LazyDesigner</h1>
      <p>Installation, compatibility, runtime supervision, and diagnostics.</p>
    </div>
    <button onclick={refresh} disabled={loading || busyAction !== null}>{loading ? 'Checking…' : 'Refresh'}</button>
  </header>

  {#if error}
    <section class="notice danger">{error}</section>
  {:else if loading && !status}
    <section class="notice">Reading local LazyDesigner state…</section>
  {:else if status}
    <section class="grid" aria-live="polite">
      <article>
        <span>Blockbench</span>
        <strong class:ok={status.blockbench.running}>{status.blockbench.running ? 'Running' : 'Closed'}</strong>
        <small>{status.blockbench.version ? `Version ${status.blockbench.version}` : 'Desktop process detection only.'}</small>
      </article>

      <article>
        <span>Compatibility</span>
        <strong
          class:ok={status.blockbench.compatibility?.status === 'validated'}
          class:warn={status.blockbench.compatibility?.status === 'compatible-unverified' || status.blockbench.compatibility?.status === 'review-required'}
          class:bad={status.blockbench.compatibility?.status === 'unsupported' || status.blockbench.compatibility?.status === 'invalid'}
        >
          {compatibilityLabel(status.blockbench.compatibility?.status)}
        </strong>
        <small>
          {#if status.blockbench.compatibility}
            Minimum {status.blockbench.compatibility.minimum_version} · review boundary {status.blockbench.compatibility.review_boundary_version}
          {:else}
            Start Blockbench to inspect compatibility.
          {/if}
        </small>
      </article>

      <article>
        <span>Managed Installation</span>
        <strong class:ok={status.manager_available}>{status.manager_available ? 'Available' : 'Not installed'}</strong>
        <small>{status.managed?.installed?.source_sha?.slice(0, 12) ?? 'No active source identity'}</small>
      </article>

      <article>
        <span>Gateway</span>
        <strong
          class:ok={status.gateway.state === 'healthy'}
          class:warn={status.gateway.state === 'waiting-runtime' || status.gateway.state === 'client-disconnected'}
          class:bad={status.gateway.state === 'runtime-offline'}
        >
          {status.gateway.state === 'healthy' ? 'Healthy' :
           status.gateway.state === 'waiting-runtime' ? 'Waiting for Runtime' :
           status.gateway.state === 'client-disconnected' ? 'Client disconnected' :
           status.gateway.state === 'runtime-offline' ? 'Runtime offline' : 'Idle'}
        </strong>
        <small>Ownership: {status.gateway.ownership}. The MCP client owns Gateway startup.</small>
      </article>

      <article>
        <span>Runtime</span>
        <strong class:ok={status.managed?.runtime_online}>{yesNo(status.managed?.runtime_online)}</strong>
        <small>Blockbench Runtime reachability.</small>
      </article>

      <article>
        <span>Update State</span>
        <strong class:warn={status.managed?.pending}>{status.managed?.pending ? 'Pending activation' : 'Stable'}</strong>
        <small>No background release polling.</small>
      </article>
    </section>

    <section class="actions" aria-label="LazyDesigner maintenance actions">
      <div>
        <h2>Maintenance</h2>
        <p>Actions are explicit and delegated to the existing managed distribution.</p>
      </div>
      <div class="action-buttons">
        <button
          onclick={() => runManagedAction('update')}
          disabled={!status.manager_available || busyAction !== null}
        >
          {busyAction === 'update' ? 'Updating…' : 'Update LazyDesigner'}
        </button>
        <button
          class="secondary"
          onclick={() => runManagedAction('recover')}
          disabled={!status.manager_available || busyAction !== null}
        >
          {busyAction === 'recover' ? 'Recovering…' : 'Recover interrupted install'}
        </button>
      </div>
    </section>

    {#if status.gateway.action}
      <section class="notice gateway-guidance">
        <strong>Gateway guidance</strong>
        <span>{status.gateway.action}</span>
      </section>
    {/if}

    {#if actionMessage}
      <section class="notice ok-notice">{actionMessage}</section>
    {/if}

    {#if status.blockbench.diagnostic}
      <section class="notice">{status.blockbench.diagnostic}</section>
    {/if}

    {#if status.diagnostic}
      <section class="notice">{status.diagnostic}</section>
    {/if}
  {/if}

  <footer>
    Desktop is a supervisor only. Authoring remains owned by Blockbench Runtime; install/update/rollback remains owned by Managed Distribution.
  </footer>
</main>
