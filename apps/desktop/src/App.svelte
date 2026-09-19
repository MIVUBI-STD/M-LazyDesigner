<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { onMount } from 'svelte';

  type ManagedStatus = {
    schema?: number;
    installed?: { source_sha?: string } | null;
    pending?: boolean;
    gateway_active?: boolean;
    runtime_online?: boolean;
  };

  type SystemStatus = {
    schema: number;
    blockbench_running: boolean;
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
        <strong class:ok={status.blockbench_running}>{status.blockbench_running ? 'Running' : 'Closed'}</strong>
        <small>Desktop process detection only.</small>
      </article>

      <article>
        <span>Managed Installation</span>
        <strong class:ok={status.manager_available}>{status.manager_available ? 'Available' : 'Not installed'}</strong>
        <small>{status.managed?.installed?.source_sha?.slice(0, 12) ?? 'No active source identity'}</small>
      </article>

      <article>
        <span>Gateway</span>
        <strong class:ok={status.managed?.gateway_active}>{yesNo(status.managed?.gateway_active)}</strong>
        <small>Persistent MCP client boundary.</small>
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

    {#if actionMessage}
      <section class="notice ok-notice">{actionMessage}</section>
    {/if}

    {#if status.diagnostic}
      <section class="notice">{status.diagnostic}</section>
    {/if}
  {/if}

  <footer>
    Desktop is a supervisor only. Authoring remains owned by Blockbench Runtime; install/update/rollback remains owned by Managed Distribution.
  </footer>
</main>
