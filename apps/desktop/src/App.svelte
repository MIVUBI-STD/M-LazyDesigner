<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { onDestroy, onMount } from 'svelte';

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
    schema: number;
    installed: { source_sha: string } | null;
    pending: boolean;
    gateway_active: boolean;
    runtime_online: boolean;
    tls_ready: boolean;
    tls_error: string | null;
    rollback?: { available: boolean; previous_source_sha: string | null; transaction: string | null };
  };

  type MaintenanceAvailability = {
    update: boolean;
    rollback: boolean;
    repair: boolean;
    recover: boolean;
    setup_tls: boolean;
    blocked_reason: string | null;
  };

  type GatewaySupervision = {
    ownership: 'client-owned';
    state: 'healthy' | 'waiting-runtime' | 'client-disconnected' | 'runtime-offline' | 'idle' | 'unknown';
    action: string | null;
  };

  type ReadinessProjection = {
    state: 'ready' | 'ready-to-start' | 'needs-connection' | 'needs-attention' | 'setup-required';
    summary: string;
    ready: boolean;
  };

  type SystemStatus = {
    schema: number;
    observed_at_unix_ms: number;
    readiness: ReadinessProjection;
    blockbench: BlockbenchState;
    gateway: GatewaySupervision;
    maintenance: MaintenanceAvailability;
    manager_available: boolean;
    bootstrap_available: boolean;
    managed: ManagedStatus | null;
    diagnostic: string | null;
  };

  type PluginFileActionResult = {
    status: 'SHOWN';
  };

  type BootstrapActionResult = {
    action: 'install';
    receipt: Record<string, unknown>;
  };

  type BlockbenchActionResult = {
    status: 'STARTED' | 'ALREADY_RUNNING';
  };

  type ManagedActionResult = {
    action: 'update' | 'rollback' | 'recover' | 'repair' | 'setup-tls';
    receipt: Record<string, unknown>;
  };

  type DesktopCommandError = {
    code: string;
    message: string;
    recoverable: boolean;
  };

  type DiagnosticExportResult = {
    status: 'EXPORTED' | 'CANCELLED';
    path: string | null;
  };

  let status: SystemStatus | null = null;
  let loading = true;
  let error = '';
  let busyAction: 'install' | 'update' | 'rollback' | 'recover' | 'repair' | 'setup-tls' | 'open-blockbench' | 'show-plugin' | 'export-diagnostics' | null = null;
  let actionMessage = '';
  let progressStage = '';
  let stopProgressListener: (() => void) | null = null;

  type ManagedProgress = { schema: number; kind: 'progress'; action: string; stage: string };
  const progressLabel = (stage: string) => stage.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

  type OperationRecord = {
    action: string;
    outcome: 'success' | 'failed';
    status: string;
    at: string;
  };
  let operations: OperationRecord[] = [];

  function recordOperation(action: string, outcome: 'success' | 'failed', status: string) {
    operations = [
      { action, outcome, status, at: new Date().toLocaleTimeString() },
      ...operations,
    ].slice(0, 8);
  }

  function errorCode(cause: unknown): string {
    if (typeof cause === 'object' && cause !== null && 'code' in cause) {
      const value = (cause as Partial<DesktopCommandError>).code;
      if (typeof value === 'string' && value) return value;
    }
    return 'FAILED';
  }

  function errorMessage(cause: unknown): string {
    if (typeof cause === 'object' && cause !== null && 'message' in cause) {
      const candidate = cause as Partial<DesktopCommandError>;
      if (typeof candidate.message === 'string') {
        return candidate.code ? `${candidate.code}: ${candidate.message}` : candidate.message;
      }
    }
    return cause instanceof Error ? cause.message : String(cause);
  }

  async function refresh() {
    loading = true;
    error = '';
    try {
      status = await invoke<SystemStatus>('system_status');
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      loading = false;
    }
  }

  async function installLazyDesigner() {
    if (!status?.bootstrap_available || status.manager_available || busyAction) return;
    busyAction = 'install';
    error = '';
    actionMessage = '';
    try {
      const result = await invoke<BootstrapActionResult>('bootstrap_install');
      const receiptStatus = typeof result.receipt.status === 'string' ? result.receipt.status : 'INSTALLED';
      actionMessage = `Install: ${receiptStatus}. In Blockbench, use Plugins → Load Plugin from File once and select the managed plugin highlighted by Desktop.`;
      recordOperation('Install LazyDesigner', 'success', receiptStatus);
      await refresh();
    } catch (cause) {
      recordOperation('Install LazyDesigner', 'failed', errorCode(cause));
      error = errorMessage(cause);
    } finally {
      busyAction = null;
    }
  }

  async function showPluginFile() {
    if (!status?.manager_available || busyAction) return;
    busyAction = 'show-plugin';
    error = '';
    try {
      await invoke<PluginFileActionResult>('show_plugin_file');
      actionMessage = 'Managed plugin file highlighted. In Blockbench choose Plugins → Load Plugin from File and select it once.';
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busyAction = null;
    }
  }

  async function openBlockbench() {
    if (busyAction) return;
    busyAction = 'open-blockbench';
    error = '';
    actionMessage = '';
    try {
      const result = await invoke<BlockbenchActionResult>('open_blockbench');
      actionMessage = result.status === 'STARTED' ? 'Blockbench started.' : 'Blockbench is already running.';
      recordOperation('Open Blockbench', 'success', result.status);
      await refresh();
    } catch (cause) {
      recordOperation('Open Blockbench', 'failed', errorCode(cause));
      error = errorMessage(cause);
    } finally {
      busyAction = null;
    }
  }

  async function exportDiagnostics() {
    if (busyAction) return;
    busyAction = 'export-diagnostics';
    error = '';
    actionMessage = '';
    try {
      const result = await invoke<DiagnosticExportResult>('export_diagnostics');
      actionMessage = result.status === 'EXPORTED'
        ? `Diagnostic snapshot exported to ${result.path ?? 'the selected location'}.`
        : 'Diagnostic export cancelled.';
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busyAction = null;
    }
  }

  async function runManagedAction(action: 'update' | 'rollback' | 'recover' | 'repair' | 'setup-tls') {
    if (!status?.manager_available || busyAction) return;
    busyAction = action;
    progressStage = 'preflight';
    error = '';
    actionMessage = '';
    try {
      const result = await invoke<ManagedActionResult>('managed_action', { action });
      const receiptStatus = typeof result.receipt.status === 'string' ? result.receipt.status : 'COMPLETE';
      const actionLabel = action === 'update' ? 'Update managed components' : action === 'rollback' ? 'Rollback managed components' : action === 'repair' ? 'Repair installation' : action === 'setup-tls' ? 'Setup Runtime Security' : 'Recover interrupted install';
      actionMessage = `${actionLabel}: ${receiptStatus}`;
      recordOperation(actionLabel, 'success', receiptStatus);
      await refresh();
    } catch (cause) {
      const actionLabel = action === 'update' ? 'Update managed components' : action === 'rollback' ? 'Rollback managed components' : action === 'repair' ? 'Repair installation' : action === 'setup-tls' ? 'Setup Runtime Security' : 'Recover interrupted install';
      recordOperation(actionLabel, 'failed', errorCode(cause));
      error = errorMessage(cause);
    } finally {
      busyAction = null;
      progressStage = '';
    }
  }

  onMount(() => {
    void refresh();
    void listen<ManagedProgress>('managed-progress', event => {
      if (busyAction && event.payload.action === busyAction) progressStage = event.payload.stage;
    }).then(unlisten => { stopProgressListener = unlisten; });
  });

  onDestroy(() => { stopProgressListener?.(); });

  const onlineLabel = (value: boolean | undefined) => value === undefined ? 'Unknown' : value ? 'Online' : 'Offline';
  const updateStateLabel = (managed: ManagedStatus | null) => managed === null ? 'Unknown' : managed.pending ? 'Pending activation' : 'Stable';
  const tlsLabel = (managerAvailable: boolean, managed: ManagedStatus | null) => {
    if (!managerAvailable) return 'Unavailable';
    if (!managed) return 'Unknown';
    return managed.tls_ready ? 'Ready' : 'Needs setup';
  };
  const compatibilityLabel = (value: Compatibility['status'] | undefined) => {
    if (value === 'validated') return 'Validated';
    if (value === 'compatible-unverified') return 'Compatible · unverified';
    if (value === 'review-required') return 'Review required';
    if (value === 'unsupported') return 'Unsupported';
    if (value === 'invalid') return 'Unknown version';
    return 'Unavailable';
  };

  const readinessLabel = (state: ReadinessProjection['state']) => {
    if (state === 'ready') return 'Ready to work';
    if (state === 'ready-to-start') return 'Ready to start';
    if (state === 'needs-connection') return 'Needs connection';
    if (state === 'setup-required') return 'Setup required';
    return 'Needs attention';
  };

  const gatewayLabel = (state: GatewaySupervision['state']) => {
    if (state === 'healthy') return 'Healthy';
    if (state === 'waiting-runtime') return 'Waiting for Runtime';
    if (state === 'client-disconnected') return 'Client disconnected';
    if (state === 'runtime-offline') return 'Runtime offline';
    if (state === 'unknown') return 'Unknown';
    return 'Idle';
  };

  const gatewayTone = (state: GatewaySupervision['state']) =>
    state === 'healthy' ? 'positive' :
    state === 'runtime-offline' ? 'negative' :
    state === 'idle' ? 'neutral' : 'warning';

</script>

<div class="app-frame">
  <aside class="sidebar">
    <div class="brand-block">
      <div class="brand-mark" aria-hidden="true">LD</div>
      <div>
        <strong>LazyDesigner</strong>
        <span>Desktop Control Plane</span>
      </div>
    </div>

    <nav class="side-nav" aria-label="LazyDesigner sections">
      <a class="active" href="#overview">
        <span class="nav-dot"></span>
        Overview
      </a>
      <a href="#maintenance">
        <span class="nav-dot"></span>
        Maintenance
      </a>
      <a href="#activity">
        <span class="nav-dot"></span>
        Activity
      </a>
    </nav>

    <div class="sidebar-meta">
      <span>Machine supervisor</span>
      <small>Authoring remains in Blockbench.</small>
    </div>
  </aside>

  <main class="workspace">
    <header class="topbar">
      <div>
        <span class="eyebrow">System overview</span>
        <h1>LazyDesigner</h1>
      </div>
      <button class="button button-quiet" onclick={refresh} disabled={loading || busyAction !== null}>
        {loading ? 'Checking…' : 'Refresh status'}
      </button>
    </header>

    {#if error}
      <section class="banner banner-danger" role="alert">
        <div>
          <strong>Action failed</strong>
          <span>{error}</span>
        </div>
      </section>
    {/if}

    {#if loading && !status}
      <section class="loading-state">
        <div class="loading-pulse"></div>
        <div>
          <strong>Reading local state</strong>
          <span>Checking Blockbench, managed components, Runtime, and Gateway.</span>
        </div>
      </section>
    {:else if status}
      <section id="overview" class="overview-stack">
        <section class:ready={status.readiness.ready} class="readiness-card" aria-live="polite">
          <div class="readiness-main">
            <span class="status-orb" aria-hidden="true"></span>
            <div>
              <span class="section-kicker">Current state</span>
              <h2>{readinessLabel(status.readiness.state)}</h2>
              <p>{status.readiness.summary}</p>
            </div>
          </div>

          <div class="readiness-actions">
            <div class="observation">
              <span>Observed</span>
              <strong>{new Date(status.observed_at_unix_ms).toLocaleTimeString()}</strong>
            </div>

            {#if !status.manager_available}
              <button
                class="button button-primary"
                onclick={installLazyDesigner}
                disabled={!status.bootstrap_available || busyAction !== null}
              >
                {busyAction === 'install' ? 'Installing…' : 'Install LazyDesigner'}
              </button>
            {:else}
              <button
                class="button button-primary"
                onclick={openBlockbench}
                disabled={busyAction !== null}
              >
                {busyAction === 'open-blockbench' ? 'Opening…' : status.blockbench.running ? 'Blockbench running' : 'Open Blockbench'}
              </button>
            {/if}
          </div>
        </section>

        <div class="summary-grid">
          <section class="panel">
            <div class="panel-heading">
              <div>
                <span class="section-kicker">Authoring connection</span>
                <h3>Blockbench & Runtime</h3>
              </div>
              <span class:positive={status.blockbench.running} class="state-pill">
                {status.blockbench.running ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div class="status-list">
              <div class="status-row">
                <div>
                  <span>Blockbench</span>
                  <small>{status.blockbench.version ? `Version ${status.blockbench.version}` : 'Desktop installation state'}</small>
                </div>
                <strong class:positive={status.blockbench.running}>{status.blockbench.running ? 'Running' : 'Closed'}</strong>
              </div>

              <div class="status-row">
                <div>
                  <span>Runtime</span>
                  <small>Blockbench Runtime reachability</small>
                </div>
                <strong class:positive={status.managed?.runtime_online === true} class:negative={status.managed?.runtime_online === false}>
                  {onlineLabel(status.managed?.runtime_online)}
                </strong>
              </div>

              <div class="status-row">
                <div>
                  <span>Gateway</span>
                  <small>Client-owned MCP connection</small>
                </div>
                <strong
                  class:positive={gatewayTone(status.gateway.state) === 'positive'}
                  class:warning={gatewayTone(status.gateway.state) === 'warning'}
                  class:negative={gatewayTone(status.gateway.state) === 'negative'}
                >
                  {gatewayLabel(status.gateway.state)}
                </strong>
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-heading">
              <div>
                <span class="section-kicker">Managed system</span>
                <h3>Installation</h3>
              </div>
              <span class:positive={status.manager_available} class="state-pill">
                {status.manager_available ? 'Installed' : 'Missing'}
              </span>
            </div>

            <div class="status-list">
              <div class="status-row">
                <div>
                  <span>Current source</span>
                  <small>Exact managed source identity</small>
                </div>
                <code>{status.managed?.installed?.source_sha?.slice(0, 12) ?? '—'}</code>
              </div>

              <div class="status-row">
                <div>
                  <span>Update state</span>
                  <small>Managed components only</small>
                </div>
                <strong class:warning={status.managed?.pending === true}>{updateStateLabel(status.managed)}</strong>
              </div>

              <div class="status-row">
                <div>
                  <span>Rollback</span>
                  <small>{status.managed?.rollback?.previous_source_sha ? `Previous ${status.managed.rollback.previous_source_sha.slice(0, 12)}` : 'No verified previous transition'}</small>
                </div>
                <strong class:positive={status.managed?.rollback?.available === true}>
                  {status.managed?.rollback?.available ? 'Available' : 'Unavailable'}
                </strong>
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-heading">
              <div>
                <span class="section-kicker">Environment</span>
                <h3>Security & compatibility</h3>
              </div>
            </div>

            <div class="status-list">
              <div class="status-row">
                <div>
                  <span>Runtime security</span>
                  <small>{status.managed?.tls_error ?? 'Machine-local HTTPS identity'}</small>
                </div>
                <strong class:positive={status.managed?.tls_ready === true} class:negative={status.manager_available && status.managed?.tls_ready === false}>
                  {tlsLabel(status.manager_available, status.managed)}
                </strong>
              </div>

              <div class="status-row">
                <div>
                  <span>Compatibility</span>
                  <small>
                    {#if status.blockbench.compatibility}
                      Minimum {status.blockbench.compatibility.minimum_version} · review at {status.blockbench.compatibility.review_boundary_version}
                    {:else}
                      Blockbench version not yet resolved
                    {/if}
                  </small>
                </div>
                <strong
                  class:positive={status.blockbench.compatibility?.status === 'validated'}
                  class:warning={status.blockbench.compatibility?.status === 'compatible-unverified' || status.blockbench.compatibility?.status === 'review-required'}
                  class:negative={status.blockbench.compatibility?.status === 'unsupported' || status.blockbench.compatibility?.status === 'invalid'}
                >
                  {compatibilityLabel(status.blockbench.compatibility?.status)}
                </strong>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section id="maintenance" class="section-block">
        <div class="section-heading">
          <div>
            <span class="section-kicker">Managed distribution</span>
            <h2>Maintenance</h2>
            <p>Routine actions stay visible. Recovery actions are kept separate.</p>
          </div>
        </div>

        <section class="maintenance-card">
          <div class="maintenance-primary">
            <div>
              <span class="maintenance-label">Managed components</span>
              <h3>{status.managed?.pending ? 'Update waiting for activation' : 'Installation healthy'}</h3>
              <p>Update Gateway, Runtime plugin, Skills, and managed workspace components through the canonical manager.</p>
            </div>

            <button
              class="button button-primary"
              onclick={() => runManagedAction('update')}
              disabled={!status.maintenance.update || busyAction !== null}
            >
              {busyAction === 'update' ? 'Updating…' : 'Update managed components'}
            </button>
          </div>

          <div class="utility-actions">
            {#if status.manager_available}
              <button class="button button-secondary" onclick={showPluginFile} disabled={busyAction !== null}>
                {busyAction === 'show-plugin' ? 'Opening…' : 'Show plugin file'}
              </button>
            {/if}

            <button class="button button-secondary" onclick={exportDiagnostics} disabled={busyAction !== null}>
              {busyAction === 'export-diagnostics' ? 'Exporting…' : 'Export diagnostics'}
            </button>

            {#if status.manager_available && status.managed?.tls_ready === false}
              <button
                class="button button-secondary"
                onclick={() => runManagedAction('setup-tls')}
                disabled={!status.maintenance.setup_tls || busyAction !== null}
              >
                {busyAction === 'setup-tls' ? 'Securing…' : 'Setup Runtime Security'}
              </button>
            {/if}
          </div>

          <details class="advanced-panel">
            <summary>
              <span>
                <strong>Advanced maintenance</strong>
                <small>Rollback, repair, and interrupted-install recovery</small>
              </span>
              <span class="summary-chevron">⌄</span>
            </summary>

            <div class="advanced-grid">
              <div class="advanced-action">
                <div>
                  <strong>Rollback managed components</strong>
                  <span>Restore the previous committed managed version.</span>
                </div>
                <button
                  class="button button-secondary"
                  onclick={() => runManagedAction('rollback')}
                  disabled={!status.maintenance.rollback || busyAction !== null}
                >
                  {busyAction === 'rollback' ? 'Rolling back…' : 'Rollback'}
                </button>
              </div>

              <div class="advanced-action">
                <div>
                  <strong>Repair installation</strong>
                  <span>Restore missing managed files from the active immutable package.</span>
                </div>
                <button
                  class="button button-secondary"
                  onclick={() => runManagedAction('repair')}
                  disabled={!status.maintenance.repair || busyAction !== null}
                >
                  {busyAction === 'repair' ? 'Repairing…' : 'Repair'}
                </button>
              </div>

              <div class="advanced-action">
                <div>
                  <strong>Recover interrupted install</strong>
                  <span>Recover an interrupted managed transaction without upgrading.</span>
                </div>
                <button
                  class="button button-secondary"
                  onclick={() => runManagedAction('recover')}
                  disabled={!status.maintenance.recover || busyAction !== null}
                >
                  {busyAction === 'recover' ? 'Recovering…' : 'Recover'}
                </button>
              </div>
            </div>
          </details>
        </section>

        {#if status.maintenance.blocked_reason && status.manager_available}
          <section class="banner">
            <div>
              <strong>Maintenance safety</strong>
              <span>{status.maintenance.blocked_reason}</span>
            </div>
          </section>
        {/if}

        {#if status.gateway.action}
          <section class="banner">
            <div>
              <strong>Gateway guidance</strong>
              <span>{status.gateway.action}</span>
            </div>
          </section>
        {/if}

        {#if busyAction && progressStage}
          <section class="banner banner-progress">
            <div>
              <strong>Operation in progress</strong>
              <span>{progressLabel(progressStage)}</span>
            </div>
          </section>
        {/if}

        {#if actionMessage}
          <section class="banner banner-success">
            <div>
              <strong>Completed</strong>
              <span>{actionMessage}</span>
            </div>
          </section>
        {/if}

        {#if status.blockbench.diagnostic}
          <section class="banner">
            <div>
              <strong>Blockbench diagnostic</strong>
              <span>{status.blockbench.diagnostic}</span>
            </div>
          </section>
        {/if}

        {#if status.diagnostic}
          <section class="banner">
            <div>
              <strong>Managed diagnostic</strong>
              <span>{status.diagnostic}</span>
            </div>
          </section>
        {/if}
      </section>

      <section id="activity" class="section-block section-last">
        <div class="section-heading">
          <div>
            <span class="section-kicker">Current session</span>
            <h2>Activity</h2>
            <p>Only explicit Desktop actions from this session. Nothing is persisted.</p>
          </div>
        </div>

        <section class="activity-card">
          {#if operations.length > 0}
            <div class="activity-list">
              {#each operations as operation}
                <div class="activity-row">
                  <span class:failed={operation.outcome === 'failed'} class="activity-dot"></span>
                  <div>
                    <strong>{operation.action}</strong>
                    <span>{operation.at}</span>
                  </div>
                  <code class:failed={operation.outcome === 'failed'}>{operation.status}</code>
                </div>
              {/each}
            </div>
          {:else}
            <div class="empty-state">
              <strong>No actions yet</strong>
              <span>Maintenance and launch actions will appear here during this session.</span>
            </div>
          {/if}
        </section>
      </section>

      <footer>
        LazyDesigner Desktop supervises machine state only. Authoring remains owned by Blockbench Runtime; managed install, update, rollback, and recovery remain owned by Managed Distribution.
      </footer>
    {/if}
  </main>
</div>
