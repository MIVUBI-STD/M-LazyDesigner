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
  let successToastTimer: number | null = null;
  let utilityMenuOpen = false;
  type Page = 'Overview' | 'Support';
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

  function navigate(next: Page) {
    utilityMenuOpen = false;
    page = next;
  }

  function closeUtilityMenu() {
    utilityMenuOpen = false;
  }

  function clearSuccessToast() {
    if (successToastTimer !== null) window.clearTimeout(successToastTimer);
    successToastTimer = null;
    actionMessage = '';
  }

  function showSuccessToast(message: string) {
    if (successToastTimer !== null) window.clearTimeout(successToastTimer);
    actionMessage = message;
    successToastTimer = window.setTimeout(() => {
      actionMessage = '';
      successToastTimer = null;
    }, 6500);
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
        return candidate.message;
      }
    }
    return cause instanceof Error ? cause.message : String(cause);
  }

  async function refresh() {
    closeUtilityMenu();
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
    clearSuccessToast();
    try {
      const result = await invoke<BootstrapActionResult>('bootstrap_install');
      const receiptStatus = typeof result.receipt.status === 'string' ? result.receipt.status : 'INSTALLED';
      showSuccessToast(`Setup complete. Open Blockbench and load the LazyDesigner plugin to finish connecting.`);
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
    closeUtilityMenu();
    busyAction = 'show-plugin';
    error = '';
    try {
      await invoke<PluginFileActionResult>('show_plugin_file');
      showSuccessToast('Plugin file is ready. In Blockbench choose Plugins → Load Plugin from File and select it.');
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busyAction = null;
    }
  }

  async function openBlockbench() {
    if (busyAction) return;
    closeUtilityMenu();
    busyAction = 'open-blockbench';
    error = '';
    clearSuccessToast();
    try {
      const result = await invoke<BlockbenchActionResult>('open_blockbench');
      showSuccessToast(result.status === 'STARTED' ? 'Blockbench started.' : 'Blockbench is already running.');
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
    closeUtilityMenu();
    busyAction = 'export-diagnostics';
    error = '';
    clearSuccessToast();
    try {
      const result = await invoke<DiagnosticExportResult>('export_diagnostics');
      if (result.status === 'EXPORTED') showSuccessToast('Diagnostics exported successfully.');
      else actionMessage = '';
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busyAction = null;
    }
  }

  async function runManagedAction(action: 'update' | 'rollback' | 'recover' | 'repair' | 'setup-tls') {
    if (!status?.manager_available || busyAction) return;
    closeUtilityMenu();
    busyAction = action;
    progressStage = 'preflight';
    error = '';
    clearSuccessToast();
    try {
      const result = await invoke<ManagedActionResult>('managed_action', { action });
      const receiptStatus = typeof result.receipt.status === 'string' ? result.receipt.status : 'COMPLETE';
      const actionLabel = action === 'update' ? 'Update LazyDesigner' : action === 'rollback' ? 'Restore previous version' : action === 'repair' ? 'Repair LazyDesigner' : action === 'setup-tls' ? 'Finish secure setup' : 'Finish incomplete setup';
      showSuccessToast(`${actionLabel} completed.`);
      recordOperation(actionLabel, 'success', receiptStatus);
      await refresh();
    } catch (cause) {
      const actionLabel = action === 'update' ? 'Update LazyDesigner' : action === 'rollback' ? 'Restore previous version' : action === 'repair' ? 'Repair LazyDesigner' : action === 'setup-tls' ? 'Finish secure setup' : 'Finish incomplete setup';
      recordOperation(actionLabel, 'failed', errorCode(cause));
      error = errorMessage(cause);
    } finally {
      busyAction = null;
      progressStage = '';
    }
  }

  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') utilityMenuOpen = false;
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (utilityMenuOpen && target instanceof Element && !target.closest('.more-menu')) utilityMenuOpen = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    void refresh();
    void listen<ManagedProgress>('managed-progress', event => {
      if (busyAction && event.payload.action === busyAction) progressStage = event.payload.stage;
    }).then(unlisten => { stopProgressListener = unlisten; });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  });

  onDestroy(() => {
    stopProgressListener?.();
    if (successToastTimer !== null) window.clearTimeout(successToastTimer);
  });

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

  type ProductMode = 'welcome' | 'security-setup' | 'unsupported' | 'ready-start' | 'plugin-setup' | 'ready' | 'attention';

  function productMode(value: SystemStatus): ProductMode {
    if (!value.manager_available) return 'welcome';
    if (value.managed?.tls_ready === false) return 'security-setup';
    if (value.blockbench.compatibility?.status === 'unsupported' || value.blockbench.compatibility?.status === 'invalid') return 'unsupported';
    if (!value.blockbench.running) return 'ready-start';
    if (
      value.readiness.state === 'needs-connection'
      || value.gateway.state === 'waiting-runtime'
      || value.gateway.state === 'runtime-offline'
      || value.gateway.state === 'client-disconnected'
    ) return 'plugin-setup';
    if (value.readiness.ready) return 'ready';
    return 'attention';
  }

  function productHeadline(value: SystemStatus) {
    const mode = productMode(value);
    if (mode === 'welcome') return 'Welcome to LazyDesigner';
    if (mode === 'security-setup') return 'Finish setup';
    if (mode === 'unsupported') return 'Blockbench version not supported';
    if (mode === 'ready-start') return 'Ready to start';
    if (mode === 'plugin-setup') return 'Connect LazyDesigner to Blockbench';
    if (mode === 'ready') return 'Ready to use';
    return 'Action required';
  }

  function productMessage(value: SystemStatus) {
    const mode = productMode(value);
    if (mode === 'welcome') return 'Set up LazyDesigner once, then continue your work in Blockbench.';
    if (mode === 'security-setup') return 'Complete the secure local setup required for LazyDesigner to connect safely.';
    if (mode === 'unsupported') return 'This Blockbench version cannot be used safely with the current LazyDesigner build.';
    if (mode === 'ready-start') return 'Everything is installed. Open Blockbench when you are ready to work.';
    if (mode === 'plugin-setup') return 'Open Blockbench and load or reload the LazyDesigner plugin to finish the connection.';
    if (mode === 'ready') return 'Everything is working. Continue in Blockbench.';
    return value.readiness.summary;
  }

  function productGuidance(value: SystemStatus) {
    const mode = productMode(value);
    if (mode === 'welcome' && !value.bootstrap_available) return 'This Desktop build does not contain the setup package. Open Support and export diagnostics.';
    if (mode === 'security-setup' && !value.maintenance.setup_tls) return value.maintenance.blocked_reason ?? 'Secure setup is temporarily unavailable. Close active authoring tasks and try again.';
    if (mode === 'unsupported') return 'Update Blockbench to a supported version, then refresh this page.';
    if (mode === 'plugin-setup') return 'Use Plugins → Load Plugin from File in Blockbench, then select the LazyDesigner plugin.';
    if (mode === 'attention') return value.gateway.action ?? value.blockbench.diagnostic ?? value.diagnostic ?? 'Open Support for troubleshooting tools.';
    return null;
  }



</script>

{#snippet navIcon(item: Page)}
  {#if item === 'Overview'}
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 11 8-7 8 7"/><path d="M6.5 10v9h11v-9M10 19v-5h4v5"/></svg>
  {:else}
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5h14M7.5 11h9M9.5 15.5h5"/><circle cx="12" cy="19" r="1"/></svg>
  {/if}
{/snippet}

{#if loading && !status}
  <main class="loading-screen" aria-live="polite">
    <div class="loading-dot"></div>
    <div><strong>LazyDesigner</strong><span>Checking setup…</span></div>
  </main>
{:else}
  <a class="skip-link" href="#main-content">Skip to content</a>
  <div class="desktop-shell">
    <aside class="navigation" aria-label="LazyDesigner navigation">
      <div class="navigation-brand">
        <span class="brand-dot" aria-hidden="true"></span>
        <strong>LazyDesigner</strong>
      </div>

      <nav class="global-nav">
        <button class:active={page === 'Overview'} aria-current={page === 'Overview' ? 'page' : undefined} onclick={() => navigate('Overview')}>
          <span class="nav-icon">{@render navIcon('Overview')}</span><span>Overview</span>
        </button>
        <button class:active={page === 'Support'} aria-current={page === 'Support' ? 'page' : undefined} onclick={() => navigate('Support')}>
          <span class="nav-icon">{@render navIcon('Support')}</span><span>Support</span>
        </button>
      </nav>

      <div class="navigation-spacer"></div>
      <div class="navigation-footer">Desktop</div>
    </aside>

    <section id="main-content" class="main-view" tabindex="-1">
      {#if !status}
        <header class="page-toolbar"><h1>Overview</h1></header>
        <main class="content">
          <section class="issue-layout">
            <div class="status-mark danger-mark">!</div>
            <div class="issue-copy">
              <h2>LazyDesigner is unavailable</h2>
              <p>Desktop could not read the local LazyDesigner state.</p>
            </div>
            <div class="action-row"><button class="primary-button" onclick={refresh} disabled={loading}>Try again</button></div>
          </section>
        </main>

      {:else if page === 'Overview'}
        <header class="page-toolbar">
          <h1>Overview</h1>
          <details class="more-menu" bind:open={utilityMenuOpen}>
            <summary aria-label="More actions" aria-haspopup="menu" aria-expanded={utilityMenuOpen}>•••</summary>
            <div class="menu-popover" role="menu">
              <button role="menuitem" disabled={loading || busyAction !== null} onclick={refresh}>Refresh</button>
              {#if status.manager_available}<button role="menuitem" disabled={busyAction !== null} onclick={showPluginFile}>Show plugin file</button>{/if}
              <button role="menuitem" disabled={busyAction !== null} onclick={exportDiagnostics}>Export diagnostics</button>
            </div>
          </details>
        </header>

        <main class="content overview-content">
          {#if busyAction && progressStage}
            <section class="task-strip" aria-live="polite">
              <span class="task-spinner" aria-hidden="true"></span>
              <div><strong>{busyAction === 'update' ? 'Updating LazyDesigner' : busyAction === 'rollback' ? 'Restoring previous version' : busyAction === 'repair' ? 'Repairing LazyDesigner' : busyAction === 'recover' ? 'Finishing setup' : busyAction === 'setup-tls' ? 'Finishing setup' : busyAction === 'open-blockbench' ? 'Opening Blockbench' : 'Working'}</strong><span>{progressLabel(progressStage)}</span></div>
            </section>
          {/if}

          {#if productMode(status) === 'ready'}
            <section class="ready-layout">
              <div class="status-line"><span class="ready-dot"></span><h2>Ready</h2></div>
              <p class="lead">Connected to Blockbench.</p>
              <div class="single-meta"><span>Blockbench</span><strong>{status.blockbench.version ? status.blockbench.version : 'Running'}</strong></div>
              <button class="text-link" onclick={() => navigate('Support')}>System details</button>
            </section>

          {:else if productMode(status) === 'welcome'}
            <section class="setup-layout">
              <div class="setup-heading">
                <span class="eyebrow">Getting started</span>
                <h2>Set up LazyDesigner</h2>
                <p>Connect LazyDesigner to Blockbench in two steps.</p>
              </div>

              <div class="step-list">
                <div class="step-row active">
                  <span class="step-index">1</span>
                  <div><strong>Install LazyDesigner</strong><span>Set up the required components on this computer.</span></div>
                </div>
                <div class="step-row">
                  <span class="step-index">2</span>
                  <div><strong>Connect Blockbench</strong><span>Load the LazyDesigner plugin once in Blockbench.</span></div>
                </div>
              </div>

              <div class="action-row">
                <button class="primary-button" onclick={installLazyDesigner} disabled={!status.bootstrap_available || busyAction !== null}>
                  {busyAction === 'install' ? 'Setting up…' : 'Continue'}
                </button>
              </div>

              {#if productGuidance(status)}
                <p class="inline-warning">{productGuidance(status)}</p>
              {/if}
            </section>

          {:else if productMode(status) === 'ready-start'}
            <section class="issue-layout neutral-layout">
              <div class="status-mark neutral-mark">→</div>
              <div class="issue-copy">
                <h2>Ready to start</h2>
                <p>LazyDesigner is installed. Open Blockbench when you are ready to work.</p>
              </div>
              <div class="action-row"><button class="primary-button" onclick={openBlockbench} disabled={busyAction !== null}>{busyAction === 'open-blockbench' ? 'Opening…' : 'Open Blockbench'}</button></div>
            </section>

          {:else if productMode(status) === 'plugin-setup'}
            <section class="issue-layout">
              <div class="status-mark warning-mark">!</div>
              <div class="issue-copy">
                <h2>Connect to Blockbench</h2>
                <p>LazyDesigner is installed but not connected.</p>

                <ol class="instruction-list">
                  <li>Open Blockbench.</li>
                  <li>Choose Plugins → Load Plugin from File.</li>
                  <li>Select the highlighted LazyDesigner plugin.</li>
                </ol>
              </div>
              <div class="action-row dual-actions">
                <button class="primary-button" onclick={showPluginFile} disabled={busyAction !== null}>{busyAction === 'show-plugin' ? 'Opening…' : 'Show plugin file'}</button>
                <button class="secondary-button" onclick={openBlockbench} disabled={busyAction !== null}>Open Blockbench</button>
              </div>
            </section>

          {:else if productMode(status) === 'security-setup'}
            <section class="issue-layout">
              <div class="status-mark info-mark">•</div>
              <div class="issue-copy">
                <h2>Finish setup</h2>
                <p>LazyDesigner needs to complete its secure local connection before it can be used.</p>
              </div>
              <div class="action-row"><button class="primary-button" onclick={() => runManagedAction('setup-tls')} disabled={!status.maintenance.setup_tls || busyAction !== null}>{busyAction === 'setup-tls' ? 'Finishing…' : 'Finish setup'}</button></div>
              {#if productGuidance(status)}<p class="inline-warning">{productGuidance(status)}</p>{/if}
            </section>

          {:else if productMode(status) === 'unsupported'}
            <section class="issue-layout">
              <div class="status-mark danger-mark">!</div>
              <div class="issue-copy">
                <h2>Blockbench version not supported</h2>
                <p>Update Blockbench to a supported version before continuing.</p>
              </div>
              <div class="action-row"><button class="secondary-button" onclick={refresh} disabled={loading || busyAction !== null}>Check again</button></div>
            </section>

          {:else}
            <section class="issue-layout">
              <div class="status-mark warning-mark">!</div>
              <div class="issue-copy">
                <h2>Action required</h2>
                <p>{productGuidance(status) ?? status.readiness.summary}</p>
              </div>
              <div class="action-row"><button class="secondary-button" onclick={() => navigate('Support')}>Open Support</button></div>
            </section>
          {/if}

          {#if status.managed?.pending}
            <section class="update-row">
              <div><strong>Update available</strong><span>A newer LazyDesigner component set is ready.</span></div>
              <button class="secondary-button compact-button" onclick={() => runManagedAction('update')} disabled={!status.maintenance.update || busyAction !== null}>{busyAction === 'update' ? 'Updating…' : 'Update'}</button>
            </section>
          {/if}
        </main>

      {:else}
        <header class="page-toolbar"><h1>Support</h1></header>
        <main class="content support-content">
          {#if productMode(status) !== 'ready'}
            <section class="support-alert">
              <span class="support-alert-dot"></span>
              <div><strong>{productHeadline(status)}</strong><span>{productMessage(status)}</span></div>
            </section>
          {/if}

          <section class="support-section">
            <h2>About</h2>
            <div class="definition-list">
              <div><span>LazyDesigner</span><strong>0.1.0</strong></div>
              <div><span>Blockbench</span><strong>{status.blockbench.version ?? (status.blockbench.running ? 'Running' : 'Not running')}</strong></div>
              {#if status.managed?.installed?.source_sha}<div><span>Managed build</span><code>{status.managed.installed.source_sha.slice(0, 12)}</code></div>{/if}
            </div>
          </section>

          <section class="support-section">
            <h2>Troubleshooting</h2>
            <div class="support-action-row">
              <div><strong>Export diagnostics</strong><span>Create a local support snapshot. Nothing is uploaded automatically.</span></div>
              <button class="secondary-button" onclick={exportDiagnostics} disabled={busyAction !== null}>{busyAction === 'export-diagnostics' ? 'Exporting…' : 'Export'}</button>
            </div>

            {#if status.blockbench.compatibility?.status === 'unsupported' || status.blockbench.compatibility?.status === 'invalid'}
              <div class="support-note"><strong>Blockbench support</strong><span>{compatibilityLabel(status.blockbench.compatibility?.status)}</span></div>
            {/if}
            {#if status.manager_available && status.managed?.tls_ready === false}
              <div class="support-note"><strong>Local security</strong><span>Needs setup</span></div>
            {/if}

            {#if status.manager_available}
              <details class="advanced-recovery">
                <summary><span><strong>Advanced recovery</strong><small>Use only when normal setup or updates cannot finish.</small></span><span>Show</span></summary>
                <div class="recovery-list">
                  <div><span><strong>Restore previous version</strong><small>{status.maintenance.rollback ? 'Return to the last verified version.' : 'No previous version is available.'}</small></span><button class="secondary-button compact-button" onclick={() => runManagedAction('rollback')} disabled={!status.maintenance.rollback || busyAction !== null}>Restore</button></div>
                  <div><span><strong>Repair LazyDesigner</strong><small>{status.maintenance.repair ? 'Restore missing files from the current installation.' : 'Repair is not available right now.'}</small></span><button class="secondary-button compact-button" onclick={() => runManagedAction('repair')} disabled={!status.maintenance.repair || busyAction !== null}>Repair</button></div>
                  <div><span><strong>Finish incomplete setup</strong><small>{status.maintenance.recover ? 'Recover an interrupted installation.' : 'No interrupted setup was found.'}</small></span><button class="secondary-button compact-button" onclick={() => runManagedAction('recover')} disabled={!status.maintenance.recover || busyAction !== null}>Recover</button></div>
                </div>
              </details>
            {/if}
          </section>

          {#if operations.length > 0}
            <details class="recent-activity">
              <summary><span><strong>Recent activity</strong><small>Current Desktop session</small></span><span>Show</span></summary>
              <div class="recent-list">
                {#each operations as operation}
                  <div><span>{operation.action}</span><strong class:failed={operation.outcome === 'failed'}>{operation.outcome === 'success' ? 'Completed' : 'Failed'}</strong></div>
                {/each}
              </div>
            </details>
          {/if}
        </main>
      {/if}
    </section>
  </div>
{/if}

{#if error || actionMessage || (busyAction && progressStage)}
  <aside class:error={Boolean(error)} class:success={Boolean(actionMessage) && !error} class="operation-attention" aria-live={error ? 'assertive' : 'polite'}>
    <div class="attention-icon">{error ? '!' : actionMessage ? '✓' : '•'}</div>
    <div class="attention-copy"><strong>{error ? 'Something needs attention' : actionMessage ? 'Done' : 'Working'}</strong><span>{error || actionMessage || progressLabel(progressStage)}</span></div>
    <div class="attention-actions">
      {#if error}<button onclick={() => navigate('Support')}>Support</button>{/if}
      {#if error || actionMessage}<button class="dismiss" aria-label="Dismiss notification" onclick={() => { error = ''; clearSuccessToast(); }}>×</button>{/if}
    </div>
  </aside>
{/if}

<style>
  .loading-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;gap:11px;background:var(--bg);color:var(--muted)}.loading-screen>div:last-child{display:grid;gap:2px}.loading-screen strong{color:var(--text);font-size:13px}.loading-screen span{font-size:10px}.loading-dot{width:8px;height:8px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 5px var(--accent-soft)}
  .skip-link{position:fixed;z-index:1000;top:8px;left:8px;transform:translateY(-150%);padding:8px 11px;border:1px solid var(--accent);border-radius:8px;background:var(--surface);color:var(--text);font-weight:700;text-decoration:none}.skip-link:focus{transform:translateY(0)}
  .desktop-shell{display:grid;grid-template-columns:176px minmax(0,1fr);width:100%;height:100vh;background:var(--bg)}.navigation{display:flex;flex-direction:column;padding:14px 10px;border-right:1px solid var(--border-soft);background:#0f1113}.navigation-brand{display:flex;align-items:center;gap:9px;padding:5px 8px 18px}.navigation-brand strong{font-size:12px;font-weight:700;letter-spacing:-.01em}.brand-dot{width:9px;height:9px;border-radius:3px;background:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}.global-nav{display:grid;gap:2px}.global-nav button{min-height:36px;display:flex;align-items:center;gap:9px;padding:0 9px;border-radius:7px;background:transparent;color:var(--muted);font-size:11px;font-weight:600;text-align:left;cursor:pointer}.global-nav button:hover{background:var(--surface);color:var(--text-soft)}.global-nav button.active{background:var(--surface);color:var(--text)}.nav-icon{width:17px;height:17px;display:grid;place-items:center}.nav-icon :global(svg){width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}.navigation-spacer{flex:1}.navigation-footer{padding:9px 8px 2px;color:var(--muted-2);font-size:8px;text-transform:uppercase;letter-spacing:.06em}
  .main-view{min-width:0;height:100vh;display:flex;flex-direction:column;overflow:hidden}.page-toolbar{min-height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;border-bottom:1px solid var(--border-soft);background:var(--bg)}.page-toolbar h1{margin:0;font-size:17px;font-weight:680;letter-spacing:-.015em}.content{width:min(780px,calc(100% - 48px));margin:0 auto;padding:42px 0 56px;overflow:auto;min-height:0;flex:1}.overview-content{width:min(720px,calc(100% - 48px))}.support-content{width:min(760px,calc(100% - 48px))}
  .more-menu{position:relative}.more-menu summary{width:32px;height:32px;display:grid;place-items:center;list-style:none;border-radius:7px;color:var(--muted);cursor:pointer}.more-menu summary:hover,.more-menu[open] summary{background:var(--surface-2);color:var(--text)}.more-menu summary::-webkit-details-marker{display:none}.menu-popover{position:absolute;z-index:20;right:0;top:36px;width:170px;display:grid;padding:5px;border:1px solid var(--border);border-radius:9px;background:var(--surface-2);box-shadow:var(--shadow-popover)}.menu-popover button{width:100%;padding:8px;border-radius:6px;background:transparent;color:var(--text-soft);text-align:left;cursor:pointer;font-size:10px}.menu-popover button:hover:not(:disabled){background:var(--surface-3)}
  .primary-button,.secondary-button{min-height:34px;border-radius:7px;padding:7px 12px;font-size:10px;font-weight:700;cursor:pointer}.primary-button{border:1px solid var(--accent);background:var(--accent);color:var(--accent-ink)}.primary-button:hover:not(:disabled){background:var(--accent-hover)}.primary-button:active:not(:disabled){background:var(--accent-active)}.secondary-button{border:1px solid var(--border);background:var(--surface-2);color:var(--text-soft)}.secondary-button:hover:not(:disabled){background:var(--surface-3);color:var(--text)}.compact-button{min-height:30px;padding:5px 9px;font-size:9px}
  .ready-layout{padding-top:26px}.status-line{display:flex;align-items:center;gap:9px}.ready-dot{width:8px;height:8px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px var(--accent-soft)}.status-line h2{margin:0;font-size:23px;line-height:1.15;letter-spacing:-.025em}.lead{margin:8px 0 0;color:var(--text-soft);font-size:12px}.single-meta{display:flex;align-items:baseline;gap:9px;margin-top:28px;padding-top:14px;border-top:1px solid var(--border-soft)}.single-meta span{color:var(--muted-2);font-size:10px}.single-meta strong{font-size:11px;font-weight:650}.text-link{margin-top:12px;padding:0;background:transparent;color:var(--muted);font-size:10px;cursor:pointer}.text-link:hover{color:var(--text-soft)}
  .setup-layout,.issue-layout{padding-top:18px}.setup-heading{max-width:520px}.eyebrow{display:block;margin-bottom:8px;color:var(--muted-2);font-size:9px;text-transform:uppercase;letter-spacing:.08em}.setup-heading h2,.issue-copy h2{margin:0;font-size:22px;line-height:1.2;letter-spacing:-.025em}.setup-heading p,.issue-copy p{margin:8px 0 0;color:var(--muted);font-size:11px;line-height:1.55}.step-list{display:grid;margin-top:26px;border-top:1px solid var(--border-soft)}.step-row{display:grid;grid-template-columns:28px minmax(0,1fr);gap:12px;padding:14px 0;border-bottom:1px solid var(--border-soft)}.step-index{width:24px;height:24px;display:grid;place-items:center;border-radius:50%;background:var(--surface-2);color:var(--muted);font-size:9px;font-weight:750}.step-row.active .step-index{background:rgba(99,168,255,.12);color:var(--info)}.step-row>div{display:grid;gap:3px}.step-row strong{font-size:11px}.step-row span{color:var(--muted);font-size:10px}.action-row{display:flex;align-items:center;gap:8px;margin-top:22px}.inline-warning{margin:12px 0 0;color:var(--warning);font-size:10px;line-height:1.45}
  .issue-layout{display:grid;grid-template-columns:28px minmax(0,1fr);column-gap:14px}.status-mark{width:26px;height:26px;display:grid;place-items:center;border-radius:7px;background:var(--surface-2);color:var(--muted);font-size:12px;font-weight:800}.warning-mark{background:var(--warning-bg);color:var(--warning)}.danger-mark{background:var(--danger-bg);color:var(--danger)}.info-mark{background:rgba(99,168,255,.12);color:var(--info)}.neutral-mark{color:var(--text-soft)}.issue-copy{grid-column:2}.issue-layout>.action-row,.issue-layout>.inline-warning{grid-column:2}.instruction-list{margin:18px 0 0;padding-left:20px;color:var(--text-soft);font-size:10px;line-height:1.8}.dual-actions{flex-wrap:wrap}
  .task-strip{display:flex;align-items:center;gap:10px;margin-bottom:20px;padding:9px 11px;border:1px solid var(--border-soft);border-radius:8px;background:var(--bg-elevated)}.task-spinner{width:9px;height:9px;border:2px solid var(--surface-4);border-top-color:var(--info);border-radius:50%;animation:spin .8s linear infinite}.task-strip>div{display:grid;gap:1px}.task-strip strong{font-size:9px}.task-strip span{color:var(--muted);font-size:8px}.update-row{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:32px;padding-top:16px;border-top:1px solid var(--border-soft)}.update-row>div{display:grid;gap:2px}.update-row strong{font-size:10px}.update-row span{color:var(--muted);font-size:9px}
  .support-alert{display:flex;align-items:flex-start;gap:9px;margin-bottom:28px;padding-bottom:18px;border-bottom:1px solid var(--border-soft)}.support-alert-dot{width:7px;height:7px;margin-top:5px;border-radius:50%;background:var(--warning)}.support-alert>div{display:grid;gap:3px}.support-alert strong{font-size:10px}.support-alert span{color:var(--muted);font-size:9px}.support-section{padding:0 0 30px}.support-section+ .support-section{padding-top:24px;border-top:1px solid var(--border-soft)}.support-section h2{margin:0 0 14px;font-size:12px;letter-spacing:-.01em}.definition-list{display:grid}.definition-list>div{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:38px;border-bottom:1px solid var(--border-soft)}.definition-list>div:last-child{border-bottom:0}.definition-list span{color:var(--muted);font-size:10px}.definition-list strong,.definition-list code{font-size:10px;font-weight:650;color:var(--text-soft)}.definition-list code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.support-action-row{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:12px 0}.support-action-row>div{display:grid;gap:3px}.support-action-row strong{font-size:10px}.support-action-row span{color:var(--muted);font-size:9px;line-height:1.45}.support-note{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:36px;border-top:1px solid var(--border-soft)}.support-note strong{font-size:9px}.support-note span{color:var(--warning);font-size:9px}
  .advanced-recovery,.recent-activity{margin-top:14px;border-top:1px solid var(--border-soft)}.advanced-recovery summary,.recent-activity summary{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:13px 0;list-style:none;cursor:pointer}.advanced-recovery summary::-webkit-details-marker,.recent-activity summary::-webkit-details-marker{display:none}.advanced-recovery summary>span:first-child,.recent-activity summary>span:first-child{display:grid;gap:2px}.advanced-recovery summary strong,.recent-activity summary strong{font-size:10px}.advanced-recovery summary small,.recent-activity summary small{color:var(--muted);font-size:8px}.advanced-recovery summary>span:last-child,.recent-activity summary>span:last-child{color:var(--muted);font-size:9px}.recovery-list,.recent-list{display:grid;border-top:1px solid var(--border-soft)}.recovery-list>div,.recent-list>div{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:48px;border-bottom:1px solid var(--border-soft)}.recovery-list>div>span{display:grid;gap:2px}.recovery-list strong{font-size:9px}.recovery-list small{color:var(--muted);font-size:8px}.recent-list span{font-size:9px}.recent-list strong{font-size:8px;color:#9ee8b9}.recent-list strong.failed{color:#ff9aa2}
  .operation-attention{position:fixed;z-index:220;right:18px;bottom:18px;width:min(380px,calc(100vw - 36px));display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:start;padding:11px;border:1px solid var(--border);border-radius:9px;background:var(--surface-2);box-shadow:var(--shadow-popover);animation:attention-in 140ms ease-out}.operation-attention.success{border-color:var(--accent-border)}.operation-attention.error{border-color:#705c26}.attention-icon{width:24px;height:24px;display:grid;place-items:center;border-radius:6px;background:var(--surface-3);font-size:10px;font-weight:800}.success .attention-icon{background:var(--accent-soft);color:#9ee8b9}.error .attention-icon{background:var(--warning-bg);color:#fde68a}.attention-copy{display:grid;gap:2px}.attention-copy strong{font-size:10px}.attention-copy span{color:var(--muted);font-size:9px;line-height:1.45}.attention-actions{display:flex;gap:4px}.attention-actions button{min-height:26px;padding:4px 7px;border:1px solid var(--border);border-radius:6px;background:var(--surface-3);font-size:8px;font-weight:700;cursor:pointer}.attention-actions .dismiss{width:26px;padding:0;border:0;background:transparent;color:var(--muted);font-size:16px}
  @keyframes attention-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}
  @media(max-width:760px){.desktop-shell{grid-template-columns:64px minmax(0,1fr)}.navigation{padding-inline:8px}.navigation-brand strong,.global-nav button>span:not(.nav-icon),.navigation-footer{display:none}.navigation-brand{justify-content:center;padding-inline:0}.global-nav button{justify-content:center;padding:0}.content,.overview-content,.support-content{width:calc(100% - 28px);padding-top:28px}.page-toolbar{padding:0 18px}.issue-layout{grid-template-columns:1fr}.issue-copy,.issue-layout>.action-row,.issue-layout>.inline-warning{grid-column:1}.status-mark{margin-bottom:10px}.support-action-row,.recovery-list>div{align-items:flex-start;flex-direction:column}.operation-attention{right:12px;bottom:12px;width:calc(100vw - 24px);grid-template-columns:auto minmax(0,1fr)}.attention-actions{grid-column:2}}
</style>
