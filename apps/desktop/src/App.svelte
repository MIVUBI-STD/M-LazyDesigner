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
  type Page = 'Overview' | 'Activity' | 'Settings';
  let page: Page = 'Overview';

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


</script>

{#snippet navIcon(item: Page)}
  {#if item === 'Overview'}
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 11 8-7 8 7"/><path d="M6.5 10v9h11v-9M10 19v-5h4v5"/></svg>
  {:else if item === 'Activity'}
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h3l2-5 4 10 2-5h5"/></svg>
  {:else}
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M18 6l-1.4 1.4M7.4 16.6 6 18M18 18l-1.4-1.4M7.4 7.4 6 6"/></svg>
  {/if}
{/snippet}

{#if loading && !status}
  <main class="loading-screen" aria-live="polite">
    <div class="brand-mark loading-brand">L</div>
    <div class="loading-copy"><strong>LazyDesigner</strong><span>Checking your local authoring environment…</span></div>
  </main>
{:else}
  <a class="skip-link" href="#main-content">Skip to content</a>
  <div class="desktop-shell">
    <aside class="navigation" aria-label="LazyDesigner navigation">
      <div class="brand-lockup navigation-brand">
        <div class="brand-mark">L</div>
        <strong>LazyDesigner</strong>
      </div>

      <nav class="global-nav" aria-label="LazyDesigner navigation">
        <button class:active={page === 'Overview'} aria-current={page === 'Overview' ? 'page' : undefined} onclick={() => (page = 'Overview')}>
          <span class="nav-icon">{@render navIcon('Overview')}</span><span>Overview</span>
        </button>
        <button class:active={page === 'Activity'} aria-current={page === 'Activity' ? 'page' : undefined} onclick={() => (page = 'Activity')}>
          <span class="nav-icon">{@render navIcon('Activity')}</span><span>Activity</span>
          {#if busyAction || error}
            <span class:error={Boolean(error)} class="activity-status" aria-label={error ? 'Activity needs attention' : 'Operation in progress'}>
              {error ? '!' : '1'}
            </span>
          {/if}
        </button>
        <button class:active={page === 'Settings'} aria-current={page === 'Settings' ? 'page' : undefined} onclick={() => (page = 'Settings')}>
          <span class="nav-icon">{@render navIcon('Settings')}</span><span>Settings</span>
        </button>
      </nav>

      <div class="navigation-spacer"></div>
      <div class="navigation-footer"><span>Local machine</span></div>
    </aside>

    <section id="main-content" class="main-view" tabindex="-1">
      {#if !status}
        <main class="content">
          <section class="notice warning"><strong>Desktop status unavailable</strong><p>LazyDesigner could not read local state.</p></section>
        </main>
      {:else if page === 'Overview'}
        <header class="page-toolbar">
          <div>
            <h1>Overview</h1>
            <p>Your LazyDesigner environment at a glance.</p>
          </div>
          <div class="top-actions">
            {#if !status.manager_available}
              <button class="primary-button" onclick={installLazyDesigner} disabled={!status.bootstrap_available || busyAction !== null}>
                {busyAction === 'install' ? 'Installing…' : 'Install LazyDesigner'}
              </button>
            {:else}
              <button class="primary-button" onclick={openBlockbench} disabled={busyAction !== null}>
                {busyAction === 'open-blockbench' ? 'Opening…' : status.blockbench.running ? 'Blockbench running' : 'Open Blockbench'}
              </button>
            {/if}
            <details class="more-menu">
              <summary aria-label="More LazyDesigner actions">•••</summary>
              <div class="menu-popover">
                <button disabled={loading || busyAction !== null} onclick={refresh}>Refresh status</button>
                {#if status.manager_available}<button disabled={busyAction !== null} onclick={showPluginFile}>Show plugin file</button>{/if}
                <button disabled={busyAction !== null} onclick={exportDiagnostics}>Export diagnostics</button>
              </div>
            </details>
          </div>
        </header>

        <main class="content">
          <section class="overview" aria-label="LazyDesigner overview">
            <section class:running={status.readiness.ready} class:warning={!status.readiness.ready && status.readiness.state !== 'setup-required'} class="status-card">
              <div class="status-copy">
                <span class:running={status.readiness.ready} class:warning={!status.readiness.ready} class="status-dot"></span>
                <div>
                  <strong>{readinessLabel(status.readiness.state)}</strong>
                  <p>{status.readiness.summary}</p>
                </div>
              </div>

              <div class="live-facts">
                <div>
                  <span>Blockbench</span>
                  <strong>{status.blockbench.running ? 'Running' : 'Closed'}</strong>
                </div>
                <div>
                  <span>Runtime</span>
                  <strong>{onlineLabel(status.managed?.runtime_online)}</strong>
                </div>
                <div>
                  <span>Connection</span>
                  <strong>{gatewayLabel(status.gateway.state)}</strong>
                </div>
              </div>
            </section>

            {#if !status.readiness.ready}
              <details class="attention" open>
                <summary>
                  <span>
                    <strong>Needs attention</strong>
                    <small>Resolve the current issue before authoring.</small>
                  </span>
                  <span>Details</span>
                </summary>
                <div class="issue-list">
                  {#if !status.manager_available}
                    <div class="issue-row"><strong>Setup</strong><span>Install the managed LazyDesigner components first.</span></div>
                  {/if}
                  {#if status.manager_available && status.managed?.tls_ready === false}
                    <div class="issue-row"><strong>Security</strong><span>Runtime security needs setup before normal authoring.</span></div>
                  {/if}
                  {#if !status.blockbench.running && status.manager_available}
                    <div class="issue-row"><strong>Blockbench</strong><span>Open Blockbench to start the authoring environment.</span></div>
                  {/if}
                  {#if status.gateway.action}
                    <div class="issue-row"><strong>Connection</strong><span>{status.gateway.action}</span></div>
                  {/if}
                  {#if status.blockbench.diagnostic}
                    <div class="issue-row"><strong>Blockbench</strong><span>{status.blockbench.diagnostic}</span></div>
                  {/if}
                  {#if status.diagnostic}
                    <div class="issue-row"><strong>System</strong><span>{status.diagnostic}</span></div>
                  {/if}
                </div>
              </details>
            {/if}

            <section class="resource-overview" aria-labelledby="environment-heading">
              <header>
                <div><h3 id="environment-heading">Environment</h3><p>Only the information needed for normal authoring.</p></div>
              </header>
              <div class="resource-grid">
                <div>
                  <span>Blockbench</span>
                  <strong>{status.blockbench.version ? `v${status.blockbench.version}` : status.blockbench.running ? 'Running' : 'Unavailable'}</strong>
                  <small>Desktop authoring application</small>
                </div>
                <div>
                  <span>Compatibility</span>
                  <strong>{compatibilityLabel(status.blockbench.compatibility?.status)}</strong>
                  <small>LazyDesigner compatibility state</small>
                </div>
                <div>
                  <span>Managed components</span>
                  <strong>{status.managed?.pending ? 'Pending activation' : status.manager_available ? 'Current' : 'Not installed'}</strong>
                  <small>Gateway, Runtime plugin, and Skills</small>
                </div>
                <div>
                  <span>Security</span>
                  <strong>{tlsLabel(status.manager_available, status.managed)}</strong>
                  <small>Machine-local Runtime identity</small>
                </div>
              </div>
            </section>

            {#if status.manager_available}
              <section class="managed-card">
                <div class="managed-copy">
                  <strong>Managed components</strong>
                  <span>{status.managed?.pending ? 'An update is waiting for activation.' : 'Keep LazyDesigner components current through the managed distribution.'}</span>
                </div>
                <button class="primary-button" onclick={() => runManagedAction('update')} disabled={!status.maintenance.update || busyAction !== null}>
                  {busyAction === 'update' ? 'Updating…' : 'Update components'}
                </button>
              </section>

              <details class="advanced-maintenance">
                <summary>
                  <span><strong>Advanced maintenance</strong><small>Rollback, repair, recovery, and support tools</small></span>
                  <span>Details</span>
                </summary>
                <div class="advanced-body">
                  <section>
                    <header><strong>Recovery</strong><span>Use only when normal authoring or updates need intervention.</span></header>
                    <div class="advanced-actions">
                      <button class="secondary-button" onclick={() => runManagedAction('rollback')} disabled={!status.maintenance.rollback || busyAction !== null}>Rollback</button>
                      <button class="secondary-button" onclick={() => runManagedAction('repair')} disabled={!status.maintenance.repair || busyAction !== null}>Repair</button>
                      <button class="secondary-button" onclick={() => runManagedAction('recover')} disabled={!status.maintenance.recover || busyAction !== null}>Recover</button>
                    </div>
                  </section>
                  <section>
                    <header><strong>Support</strong><span>Inspect the managed plugin or export a local diagnostic snapshot.</span></header>
                    <div class="advanced-actions">
                      <button class="secondary-button" onclick={showPluginFile} disabled={busyAction !== null}>Show plugin file</button>
                      <button class="secondary-button" onclick={exportDiagnostics} disabled={busyAction !== null}>Export diagnostics</button>
                    </div>
                  </section>
                  {#if status.managed?.tls_ready === false}
                    <section>
                      <header><strong>Runtime security</strong><span>Repair the machine-local HTTPS identity.</span></header>
                      <div class="advanced-actions">
                        <button class="secondary-button" onclick={() => runManagedAction('setup-tls')} disabled={!status.maintenance.setup_tls || busyAction !== null}>Setup Runtime Security</button>
                      </div>
                    </section>
                  {/if}
                </div>
              </details>
            {/if}
          </section>
        </main>

      {:else if page === 'Activity'}
        <header class="page-toolbar">
          <div><h1>Activity</h1><p>See current and recent actions from this Desktop session.</p></div>
        </header>
        <main class="content">
          <section class="activity-page">
            {#if busyAction}
              <section class="operation-card active-operation">
                <span class="status-dot transition"></span>
                <div><strong>{busyAction === 'update' ? 'Updating managed components' : busyAction === 'rollback' ? 'Rolling back managed components' : busyAction === 'repair' ? 'Repairing installation' : busyAction === 'recover' ? 'Recovering installation' : busyAction === 'setup-tls' ? 'Setting up Runtime security' : busyAction === 'open-blockbench' ? 'Opening Blockbench' : 'Working…'}</strong><span>{progressStage ? progressLabel(progressStage) : 'In progress'}</span></div>
                <span class="operation-state">In progress</span>
              </section>
            {/if}

            {#if operations.length > 0}
              <div class="operation-list">
                {#each operations as operation}
                  <div class="operation-card">
                    <span class:danger={operation.outcome === 'failed'} class="status-dot running"></span>
                    <div><strong>{operation.action}</strong><span>{operation.at}</span></div>
                    <code class:danger-text={operation.outcome === 'failed'}>{operation.status}</code>
                  </div>
                {/each}
              </div>
            {:else if !busyAction}
              <div class="empty-state">
                <div class="empty-icon">{@render navIcon('Activity')}</div>
                <h2>No activity yet</h2>
                <p>Actions such as opening Blockbench, updating, repairing, or recovering will appear here.</p>
              </div>
            {/if}
          </section>
        </main>

      {:else}
        <header class="page-toolbar">
          <div><h1>Settings</h1><p>Support information and advanced technical context.</p></div>
        </header>
        <main class="content">
          <section class="settings-page">
            <section class="settings-group">
              <div class="group-copy"><h3>Support</h3><p>Create a local troubleshooting snapshot without project content, credentials, or private keys.</p></div>
              <div class="support-card">
                <div><strong>Export diagnostics</strong><span>Includes projected health, versions, compatibility, and Desktop platform information.</span><small>Nothing is uploaded automatically.</small></div>
                <button class="secondary-button" onclick={exportDiagnostics} disabled={busyAction !== null}>{busyAction === 'export-diagnostics' ? 'Exporting…' : 'Export diagnostics'}</button>
              </div>
            </section>

            <section class="settings-group">
              <div class="group-copy"><h3>Desktop updates</h3><p>LazyDesigner Desktop releases are separate from managed-component updates.</p></div>
              <div class="future-group">
                <div><strong>Manual release updates</strong><span>Signed automatic Desktop updates are not enabled in this build.</span></div>
                <span class="planned-badge">Manual</span>
              </div>
            </section>

            <section class="settings-group">
              <div class="group-copy"><h3>Technical information</h3><p>Detailed identities for support and troubleshooting. Normal authoring does not require these values.</p></div>
              <details class="technical-details">
                <summary><span><strong>Show technical information</strong><small>Source identity, connection ownership, and security state</small></span><span>Details</span></summary>
                <div class="support-overview">
                  <div><span>Desktop</span><strong>v0.1.0</strong></div>
                  <div><span>Managed source</span><strong title={status.managed?.installed?.source_sha ?? ''}>{status.managed?.installed?.source_sha?.slice(0, 12) ?? 'Unavailable'}</strong></div>
                  <div><span>Blockbench</span><strong>{status.blockbench.version ?? 'Unavailable'}</strong></div>
                  <div><span>Gateway</span><strong>{gatewayLabel(status.gateway.state)}</strong></div>
                  <div><span>Ownership</span><strong>{status.gateway.ownership}</strong></div>
                  <div><span>Runtime security</span><strong>{tlsLabel(status.manager_available, status.managed)}</strong></div>
                  <div><span>Rollback</span><strong>{status.managed?.rollback?.available ? 'Available' : 'Unavailable'}</strong></div>
                  <div><span>Observed</span><strong>{new Date(status.observed_at_unix_ms).toLocaleTimeString()}</strong></div>
                  <div><span>Status schema</span><strong>{status.schema}</strong></div>
                </div>
              </details>
            </section>
          </section>
        </main>
      {/if}
    </section>
  </div>
{/if}

{#if error || actionMessage || (busyAction && progressStage)}
  <aside class:error={Boolean(error)} class:success={Boolean(actionMessage) && !error} class="operation-attention" aria-live={error ? 'assertive' : 'polite'}>
    <div class="attention-icon" aria-hidden="true">{error ? '!' : actionMessage ? '✓' : '•'}</div>
    <div class="attention-copy">
      <strong>{error ? 'Action needs attention' : actionMessage ? 'Action completed' : 'Operation in progress'}</strong>
      <span>{error || actionMessage || progressLabel(progressStage)}</span>
    </div>
    <div class="attention-actions">
      <button onclick={() => (page = 'Activity')}>Open Activity</button>
      {#if error || actionMessage}<button class="dismiss" aria-label="Dismiss notification" onclick={() => { error = ''; actionMessage = ''; }}>×</button>{/if}
    </div>
  </aside>
{/if}

<style>
  .loading-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;gap:14px;color:var(--muted);background:var(--bg)}.loading-copy{display:grid;gap:1px}.loading-copy strong{color:var(--text)}.loading-copy span{font-size:12px}.skip-link{position:fixed;z-index:1000;top:8px;left:8px;transform:translateY(-150%);padding:8px 11px;border:1px solid var(--accent);border-radius:8px;background:var(--surface);color:var(--text);font-weight:700;text-decoration:none}.skip-link:focus{transform:translateY(0)}
  .brand-mark{width:34px;height:34px;display:grid;place-items:center;border-radius:9px;background:var(--accent);color:var(--accent-ink);font-weight:900}.brand-lockup{display:flex;align-items:center;gap:10px}.desktop-shell{display:grid;grid-template-columns:220px minmax(0,1fr);width:100%;height:100vh;background:var(--bg)}.navigation{display:flex;flex-direction:column;padding:14px 11px;border-right:1px solid var(--border-soft);background:#0e1012}.navigation-brand{padding:2px 8px 16px}.navigation-spacer{flex:1}.navigation-footer{padding:10px 9px 2px;color:var(--muted-2);font-size:9px;text-transform:uppercase}
  .global-nav{display:grid;gap:3px}.global-nav button{position:relative;min-height:40px;display:flex;align-items:center;gap:10px;padding:0 10px;border-radius:8px;background:transparent;color:var(--muted);font-size:11px;font-weight:650;text-align:left;cursor:pointer}.global-nav button:hover{background:var(--surface);color:var(--text-soft)}.global-nav button.active{background:var(--surface-2);color:var(--text);box-shadow:var(--shadow-inset)}.nav-icon{width:18px;height:18px;display:grid;place-items:center}.nav-icon :global(svg){width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.activity-status{margin-left:auto;min-width:20px;height:20px;display:grid;place-items:center;padding:0 6px;border-radius:999px;background:var(--accent-soft);color:#9ee8b9;font-size:9px}.activity-status.error{background:var(--warning-bg);color:#fde68a}
  .main-view{min-width:0;height:100vh;display:flex;flex-direction:column;overflow:hidden}.page-toolbar{min-height:82px;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:15px 30px;border-bottom:1px solid var(--border-soft);background:#111315}.page-toolbar h1{margin:0;font-size:23px}.page-toolbar p{margin:4px 0 0;color:var(--muted);font-size:12px}.top-actions{display:flex;align-items:center;gap:8px}.content{width:min(1040px,calc(100% - 56px));margin:0 auto;padding:26px 0 48px;overflow:auto;min-height:0;flex:1}.overview,.activity-page,.settings-page{width:min(920px,100%)}
  .primary-button,.secondary-button{min-height:36px;border-radius:8px;padding:8px 13px;font-weight:650;cursor:pointer}.primary-button{border:1px solid var(--accent);background:var(--accent);color:var(--accent-ink)}.primary-button:hover:not(:disabled){background:var(--accent-hover)}.secondary-button{border:1px solid var(--border);background:var(--surface-2);color:var(--text)}.secondary-button:hover:not(:disabled){background:var(--surface-3)}
  .more-menu{position:relative}.more-menu summary{width:38px;height:38px;display:grid;place-items:center;list-style:none;border-radius:8px;color:var(--muted);cursor:pointer}.more-menu summary:hover{background:var(--surface-2);color:var(--text)}.more-menu summary::-webkit-details-marker{display:none}.menu-popover{position:absolute;z-index:20;right:0;top:42px;width:180px;display:grid;padding:6px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);box-shadow:var(--shadow-popover)}.menu-popover button{width:100%;padding:8px 9px;border-radius:7px;background:transparent;color:var(--text-soft);text-align:left;cursor:pointer;font-size:10px}.menu-popover button:hover:not(:disabled){background:var(--surface-3);color:var(--text)}
  .status-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:22px;min-height:100px;padding:16px;border:1px solid var(--border-soft);border-radius:10px;background:var(--surface)}.status-card.running{border-color:var(--accent-border)}.status-card.warning{border-color:#5f5125}.status-copy{display:flex;align-items:flex-start;gap:11px}.status-copy strong{font-size:16px}.status-copy p{margin:3px 0 0;color:var(--muted);font-size:11px}.status-dot{width:8px;height:8px;margin-top:7px;border-radius:50%;background:#697078}.status-dot.running{background:var(--accent);box-shadow:0 0 0 4px var(--accent-soft)}.status-dot.transition{background:var(--info)}.status-dot.warning{background:var(--warning)}.status-dot.danger{background:var(--danger)}.live-facts{display:flex;border:1px solid var(--border-soft);border-radius:8px;background:var(--bg-elevated)}.live-facts div{min-width:96px;display:grid;gap:2px;padding:9px 11px;border-left:1px solid var(--border-soft)}.live-facts div:first-child{border-left:0}.live-facts span{color:var(--muted-2);font-size:8px;text-transform:uppercase}.live-facts strong{font-size:11px}
  .attention{margin-top:12px;border:1px solid #5f5125;border-radius:10px;background:var(--surface)}.attention summary,.advanced-maintenance summary,.technical-details summary{display:flex;align-items:center;justify-content:space-between;padding:11px 12px;cursor:pointer;list-style:none}.attention summary::-webkit-details-marker,.advanced-maintenance summary::-webkit-details-marker,.technical-details summary::-webkit-details-marker{display:none}.attention summary>span:first-child,.advanced-maintenance summary>span:first-child,.technical-details summary>span:first-child{display:grid;gap:2px}.attention small,.advanced-maintenance small,.technical-details small{color:var(--muted);font-size:9px}.issue-list{padding:0 12px 9px;border-top:1px solid var(--border-soft)}.issue-row{display:grid;grid-template-columns:90px 1fr;gap:12px;padding:8px 0;border-bottom:1px solid var(--border-soft);font-size:10px}.issue-row:last-child{border-bottom:0}.issue-row span{color:var(--muted)}
  .resource-overview{margin-top:16px;padding:15px;border:1px solid var(--border-soft);border-radius:10px;background:var(--surface)}.resource-overview>header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:11px}.resource-overview h3{margin:0;font-size:14px}.resource-overview header p{margin:3px 0 0;color:var(--muted);font-size:10px}.resource-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));overflow:hidden;border:1px solid var(--border-soft);border-radius:9px;background:var(--bg-elevated)}.resource-grid>div{display:grid;gap:3px;padding:10px 11px;border-right:1px solid var(--border-soft);border-bottom:1px solid var(--border-soft)}.resource-grid>div:nth-child(2n){border-right:0}.resource-grid>div:nth-last-child(-n+2){border-bottom:0}.resource-grid span{color:var(--muted-2);font-size:8px;text-transform:uppercase;letter-spacing:.04em}.resource-grid strong{font-size:12px}.resource-grid small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:8px}
  .managed-card{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:16px;padding:14px;border:1px solid var(--border-soft);border-radius:10px;background:var(--surface)}.managed-copy{display:grid;gap:3px}.managed-copy strong{font-size:11px}.managed-copy span{color:var(--muted);font-size:10px}.advanced-maintenance{margin-top:12px;border:1px solid var(--border-soft);border-radius:10px;background:var(--bg-elevated)}.advanced-body{display:grid;border-top:1px solid var(--border-soft)}.advanced-body section{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:12px;border-bottom:1px solid var(--border-soft)}.advanced-body section:last-child{border-bottom:0}.advanced-body header{display:grid;gap:3px}.advanced-body header strong{font-size:10px}.advanced-body header span{color:var(--muted);font-size:9px}.advanced-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
  .operation-list{display:grid;gap:8px}.operation-card{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:11px;align-items:center;min-height:58px;padding:11px 13px;border:1px solid var(--border-soft);border-radius:9px;background:var(--surface)}.operation-card>div{display:grid;gap:2px}.operation-card strong{font-size:10px}.operation-card span{color:var(--muted);font-size:9px}.operation-card code{color:#9ee8b9;font:9px ui-monospace,SFMono-Regular,Consolas,monospace}.operation-card code.danger-text{color:#ff9aa2}.operation-state{color:var(--info)!important;font-weight:700}.active-operation{margin-bottom:10px;border-color:#36587d}.empty-state{min-height:300px;display:grid;place-content:center;justify-items:center;text-align:center;border:1px dashed var(--border);border-radius:12px;background:var(--bg-elevated)}.empty-icon{width:50px;height:50px;display:grid;place-items:center;border-radius:13px;background:var(--surface-2);margin-bottom:13px}.empty-icon :global(svg){width:22px;height:22px;fill:none;stroke:var(--muted);stroke-width:1.8}.empty-state h2{margin:0;font-size:16px}.empty-state p{max-width:430px;margin:6px 0 0;color:var(--muted);font-size:11px}
  .settings-group{display:grid;grid-template-columns:190px minmax(0,1fr);gap:28px;padding:20px 0;border-top:1px solid var(--border-soft)}.settings-group:first-child{border-top:0}.group-copy h3{margin:0;font-size:12px}.group-copy p{margin:5px 0 0;color:var(--muted);font-size:11px;line-height:1.45}.support-card{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:14px;border:1px solid var(--border-soft);border-radius:10px;background:var(--surface)}.support-card>div{display:grid;gap:3px}.support-card strong{font-size:11px}.support-card span{color:var(--muted);font-size:10px;line-height:1.4}.support-card small{color:var(--muted-2);font-size:9px}.future-group{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:13px 14px;border:1px dashed var(--border);border-radius:10px;background:var(--bg-elevated)}.future-group>div{display:grid;gap:3px}.future-group strong{font-size:11px}.future-group span{color:var(--muted);font-size:10px}.planned-badge{padding:4px 8px;border:1px solid var(--border);border-radius:999px;white-space:nowrap}.technical-details{border:1px solid var(--border-soft);border-radius:10px;background:var(--surface)}.support-overview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));overflow:hidden;border-top:1px solid var(--border-soft)}.support-overview>div{display:grid;gap:3px;padding:11px 12px;border-right:1px solid var(--border-soft);border-bottom:1px solid var(--border-soft)}.support-overview>div:nth-child(3n){border-right:0}.support-overview>div:nth-last-child(-n+3){border-bottom:0}.support-overview span{color:var(--muted-2);font-size:8px;text-transform:uppercase}.support-overview strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}
  .notice{padding:11px 12px;border:1px solid var(--border-soft);border-radius:10px;background:var(--surface)}.notice.warning{border-color:#5f5125;background:var(--warning-bg)}.notice strong{font-size:11px}.notice p{margin:3px 0 0;color:var(--muted);font-size:10px}
  .operation-attention{position:fixed;z-index:220;right:20px;bottom:20px;width:min(430px,calc(100vw - 40px));display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:11px;align-items:start;padding:13px;border:1px solid var(--border);border-radius:11px;background:var(--surface-2);box-shadow:var(--shadow-popover)}.operation-attention.success{border-color:var(--accent-border)}.operation-attention.error{border-color:#705c26}.attention-icon{width:28px;height:28px;display:grid;place-items:center;border-radius:8px;background:var(--surface-3);font-weight:800}.success .attention-icon{background:var(--accent-soft);color:#9ee8b9}.error .attention-icon{background:var(--warning-bg);color:#fde68a}.attention-copy{display:grid;gap:3px;min-width:0}.attention-copy strong{font-size:11px}.attention-copy span{color:var(--muted);font-size:10px;line-height:1.45;overflow-wrap:anywhere}.attention-actions{display:flex;align-items:center;gap:5px}.attention-actions button{min-height:30px;padding:6px 9px;border:1px solid var(--border);border-radius:7px;background:var(--surface-3);color:var(--text);font-size:9px;font-weight:700;cursor:pointer}.attention-actions .dismiss{width:30px;padding:0;border:0;background:transparent;color:var(--muted);font-size:18px}
  @media(max-width:760px){.desktop-shell{grid-template-columns:72px minmax(0,1fr)}.navigation-brand strong,.global-nav button>span:not(.nav-icon):not(.activity-status),.navigation-footer{display:none}.navigation{padding-inline:10px}.navigation-brand{justify-content:center;padding-inline:0}.global-nav button{justify-content:center;padding:0}.activity-status{position:absolute;right:2px;top:2px}.page-toolbar{padding:15px 18px}.content{width:calc(100% - 28px)}.status-card{align-items:flex-start;grid-template-columns:1fr}.live-facts{width:100%}.resource-grid,.support-overview{grid-template-columns:1fr}.resource-grid>div,.support-overview>div{border-right:0;border-bottom:1px solid var(--border-soft)}.resource-grid>div:nth-last-child(-n+2),.support-overview>div:nth-last-child(-n+3){border-bottom:1px solid var(--border-soft)}.resource-grid>div:last-child,.support-overview>div:last-child{border-bottom:0}.managed-card,.advanced-body section,.support-card,.future-group{align-items:flex-start;flex-direction:column}.settings-group{grid-template-columns:1fr;gap:10px}.operation-attention{right:12px;bottom:12px;width:calc(100vw - 24px);grid-template-columns:auto minmax(0,1fr)}.attention-actions{grid-column:2;justify-content:flex-end}}
</style>
