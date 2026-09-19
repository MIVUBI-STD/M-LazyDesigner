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
  type Page = 'Overview' | 'Activity' | 'Support';
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

  function operationOutcomeLabel(operation: OperationRecord) {
    return operation.outcome === 'success' ? 'Completed' : 'Failed';
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
    window.addEventListener('keydown', onKeyDown);
    void refresh();
    void listen<ManagedProgress>('managed-progress', event => {
      if (busyAction && event.payload.action === busyAction) progressStage = event.payload.stage;
    }).then(unlisten => { stopProgressListener = unlisten; });
    return () => window.removeEventListener('keydown', onKeyDown);
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
    if (mode === 'unsupported') return 'Update Blockbench to a supported version, then refresh this page.';
    if (mode === 'plugin-setup') return 'Use Plugins → Load Plugin from File in Blockbench, then select the LazyDesigner plugin.';
    if (mode === 'attention') return value.gateway.action ?? value.blockbench.diagnostic ?? value.diagnostic ?? 'Open Support for troubleshooting tools.';
    return null;
  }

  function activityVisible() {
    return busyAction !== null || Boolean(error) || operations.length > 0;
  }

</script>

{#snippet navIcon(item: Page)}
  {#if item === 'Overview'}
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 11 8-7 8 7"/><path d="M6.5 10v9h11v-9M10 19v-5h4v5"/></svg>
  {:else if item === 'Activity'}
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h3l2-5 4 10 2-5h5"/></svg>
  {:else}
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16M7 11h10M9.5 15.5h5"/><circle cx="12" cy="19" r="1"/></svg>
  {/if}
{/snippet}

{#if loading && !status}
  <main class="loading-screen" aria-live="polite">
    <div class="brand-mark">L</div>
    <div class="loading-copy"><strong>LazyDesigner</strong><span>Checking your setup…</span></div>
  </main>
{:else}
  <a class="skip-link" href="#main-content">Skip to content</a>
  <div class="desktop-shell">
    <aside class="navigation" aria-label="LazyDesigner navigation">
      <div class="brand-lockup navigation-brand"><div class="brand-mark">L</div><strong>LazyDesigner</strong></div>
      <nav class="global-nav">
        <button class:active={page === 'Overview'} aria-current={page === 'Overview' ? 'page' : undefined} onclick={() => navigate('Overview')}>
          <span class="nav-icon">{@render navIcon('Overview')}</span><span>Overview</span>
        </button>
        {#if activityVisible()}
          <button class:active={page === 'Activity'} aria-current={page === 'Activity' ? 'page' : undefined} onclick={() => navigate('Activity')}>
            <span class="nav-icon">{@render navIcon('Activity')}</span><span>Activity</span>
            {#if busyAction || error}<span class:error={Boolean(error)} class="activity-status">{error ? '!' : '1'}</span>{/if}
          </button>
        {/if}
        <button class:active={page === 'Support'} aria-current={page === 'Support' ? 'page' : undefined} onclick={() => navigate('Support')}>
          <span class="nav-icon">{@render navIcon('Support')}</span><span>Support</span>
        </button>
      </nav>
      <div class="navigation-spacer"></div>
      <div class="navigation-footer"><span>Desktop</span></div>
    </aside>

    <section id="main-content" class="main-view" tabindex="-1">
      {#if !status}
        <main class="content centered-content">
          <section class="product-state attention-state">
            <span class="state-symbol">!</span>
            <div><h1>LazyDesigner is unavailable</h1><p>Desktop could not read the local LazyDesigner state.</p></div>
            <button class="primary-button" onclick={refresh} disabled={loading}>Try again</button>
          </section>
        </main>
      {:else if page === 'Overview'}
        <header class="page-toolbar">
          <div><h1>Overview</h1><p>Current status and next action.</p></div>
          <details class="more-menu" bind:open={utilityMenuOpen}>
            <summary aria-label="More actions" aria-haspopup="menu" aria-expanded={utilityMenuOpen}>•••</summary>
            <div class="menu-popover" role="menu">
              <button role="menuitem" disabled={loading || busyAction !== null} onclick={refresh}>Refresh status</button>
              {#if status.manager_available}<button role="menuitem" disabled={busyAction !== null} onclick={showPluginFile}>Show plugin file</button>{/if}
              <button role="menuitem" disabled={busyAction !== null} onclick={exportDiagnostics}>Export diagnostics</button>
            </div>
          </details>
        </header>

        <main class="content centered-content">
          <section
            class:ready-state={productMode(status) === 'ready'}
            class:attention-state={productMode(status) === 'attention' || productMode(status) === 'unsupported' || productMode(status) === 'plugin-setup'}
            class:setup-state={productMode(status) === 'welcome' || productMode(status) === 'security-setup'}
            class="product-state"
            aria-live="polite"
          >
            <span class="state-symbol">{productMode(status) === 'ready' ? '✓' : productMode(status) === 'unsupported' || productMode(status) === 'attention' ? '!' : '•'}</span>
            <div class="state-copy"><h2>{productHeadline(status)}</h2><p>{productMessage(status)}</p></div>
            <div class="state-actions">
              {#if productMode(status) === 'welcome'}
                <button class="primary-button" onclick={installLazyDesigner} disabled={!status.bootstrap_available || busyAction !== null}>
                  {busyAction === 'install' ? 'Setting up…' : 'Set up LazyDesigner'}
                </button>
              {:else if productMode(status) === 'security-setup'}
                <button class="primary-button" onclick={() => runManagedAction('setup-tls')} disabled={!status.maintenance.setup_tls || busyAction !== null}>
                  {busyAction === 'setup-tls' ? 'Finishing setup…' : 'Finish setup'}
                </button>
              {:else if productMode(status) === 'ready-start'}
                <button class="primary-button" onclick={openBlockbench} disabled={busyAction !== null}>
                  {busyAction === 'open-blockbench' ? 'Opening…' : 'Open Blockbench'}
                </button>
              {:else if productMode(status) === 'plugin-setup'}
                <button class="primary-button" onclick={showPluginFile} disabled={busyAction !== null}>
                  {busyAction === 'show-plugin' ? 'Opening…' : 'Show plugin file'}
                </button>
                <button class="secondary-button" onclick={openBlockbench} disabled={busyAction !== null}>Open Blockbench</button>
              {:else if productMode(status) === 'unsupported'}
                <button class="secondary-button" onclick={refresh} disabled={loading || busyAction !== null}>Check again</button>
              {:else if productMode(status) === 'attention'}
                <button class="secondary-button" onclick={() => navigate('Support')}>Open Support</button>
              {/if}
            </div>
          </section>

          {#if productMode(status) === 'welcome'}
            <section class="onboarding-card" aria-label="Getting started">
              <div class="onboarding-heading"><strong>Getting started</strong><span>Two steps</span></div>
              <div class="setup-steps">
                <div class="setup-step current"><span>1</span><div><strong>Set up LazyDesigner</strong><small>Install the components required on this computer.</small></div></div>
                <div class="setup-step"><span>2</span><div><strong>Connect Blockbench</strong><small>Open Blockbench and load the LazyDesigner plugin once.</small></div></div>
              </div>
            </section>
          {:else if productMode(status) === 'security-setup'}
            <section class="onboarding-card compact" aria-label="Setup progress">
              <div class="setup-step current"><span>2</span><div><strong>Secure local connection</strong><small>Finish the final machine setup before connecting Blockbench.</small></div></div>
            </section>
          {:else if productMode(status) === 'plugin-setup'}
            <section class="onboarding-card compact" aria-label="Blockbench connection">
              <div class="setup-step current"><span>✓</span><div><strong>LazyDesigner is installed</strong><small>Load the plugin in Blockbench to complete the connection.</small></div></div>
            </section>
          {/if}

          {#if productMode(status) === 'ready'}
            <section class="quiet-summary">
              <div><span class="quiet-label">Blockbench</span><strong>{status.blockbench.version ? 'v' + status.blockbench.version : 'Running'}</strong></div>
              <span class="quiet-divider"></span>
              <div><span class="quiet-label">Connection</span><strong>Ready</strong></div>
            </section>
            <button class="text-action" onclick={() => navigate('Support')}>System details</button>
          {:else if productGuidance(status)}
            <section class="guidance-card"><strong>Next step</strong><p>{productGuidance(status)}</p></section>
          {/if}

          {#if status.managed?.pending}
            <section class="update-callout">
              <div><strong>Update available</strong><span>A newer LazyDesigner component set is ready to install.</span></div>
              <button class="primary-button" onclick={() => runManagedAction('update')} disabled={!status.maintenance.update || busyAction !== null}>{busyAction === 'update' ? 'Updating…' : 'Update'}</button>
            </section>
          {/if}
        </main>

      {:else if page === 'Activity'}
        <header class="page-toolbar"><div><h1>Activity</h1><p>Tasks and recent actions from this session.</p></div></header>
        <main class="content">
          <section class="activity-page">
            {#if busyAction}
              <section class="operation-card active-operation">
                <span class="status-dot transition"></span>
                <div><strong>{busyAction === 'update' ? 'Updating LazyDesigner' : busyAction === 'rollback' ? 'Restoring previous version' : busyAction === 'repair' ? 'Repairing LazyDesigner' : busyAction === 'recover' ? 'Finishing incomplete setup' : busyAction === 'setup-tls' ? 'Finishing secure setup' : busyAction === 'open-blockbench' ? 'Opening Blockbench' : 'Working…'}</strong><span>{progressStage ? progressLabel(progressStage) : 'In progress'}</span></div>
                <span class="operation-state">In progress</span>
              </section>
            {/if}
            {#if operations.length > 0}
              <div class="operation-list">
                {#each operations as operation}
                  <div class="operation-card">
                    <span class:danger={operation.outcome === 'failed'} class="status-dot running"></span>
                    <div><strong>{operation.action}</strong><span>{operation.at}</span></div>
                    <span class:danger-text={operation.outcome === 'failed'} class="result-label" title={operation.status}>{operationOutcomeLabel(operation)}</span>
                  </div>
                {/each}
              </div>
            {:else if !busyAction}
              <div class="empty-state"><div class="empty-icon">{@render navIcon('Activity')}</div><h2>No recent activity</h2><p>Updates, repairs, and other actions will appear here.</p></div>
            {/if}
          </section>
        </main>

      {:else}
        <header class="page-toolbar"><div><h1>Support</h1><p>Help, recovery, and product information.</p></div></header>
        <main class="content">
          <section class="support-page">
            <section class="support-group">
              <div class="group-copy"><h3>System</h3><p>Key status information for LazyDesigner and Blockbench.</p></div>
              <div class="support-overview">
                <div><span>Blockbench</span><strong>{status.blockbench.version ?? (status.blockbench.running ? 'Running' : 'Closed')}</strong></div>
                <div><span>LazyDesigner</span><strong>{productMode(status) === 'ready' ? 'Ready' : productHeadline(status)}</strong></div>
                <div><span>Blockbench support</span><strong>{compatibilityLabel(status.blockbench.compatibility?.status)}</strong></div>
                <div><span>Local security</span><strong>{tlsLabel(status.manager_available, status.managed)}</strong></div>
              </div>
            </section>

            <section class="support-group">
              <div class="group-copy"><h3>Troubleshooting</h3><p>Recovery tools stay out of the normal workflow.</p></div>
              <div class="support-stack">
                <div class="support-card">
                  <div><strong>Export diagnostics</strong><span>Create a local troubleshooting snapshot. Nothing is uploaded automatically.</span></div>
                  <button class="secondary-button" onclick={exportDiagnostics} disabled={busyAction !== null}>{busyAction === 'export-diagnostics' ? 'Exporting…' : 'Export'}</button>
                </div>
                {#if status.manager_available}
                  <details class="troubleshooting-details">
                    <summary><span><strong>Advanced recovery</strong><small>Use only when setup or updates need intervention.</small></span><span>Details</span></summary>
                    <div class="recovery-list">
                      <div><span><strong>Restore previous version</strong><small>Return to the last verified version.</small></span><button class="secondary-button" title={status.maintenance.rollback ? 'Restore the previous verified version.' : status.maintenance.blocked_reason ?? 'No previous version is available.'} onclick={() => runManagedAction('rollback')} disabled={!status.maintenance.rollback || busyAction !== null}>Restore</button></div>
                      <div><span><strong>Repair LazyDesigner</strong><small>Restore missing files from the current installation.</small></span><button class="secondary-button" title={status.maintenance.repair ? 'Repair the current LazyDesigner installation.' : status.maintenance.blocked_reason ?? 'Repair is not available right now.'} onclick={() => runManagedAction('repair')} disabled={!status.maintenance.repair || busyAction !== null}>Repair</button></div>
                      <div><span><strong>Finish incomplete setup</strong><small>Recover an interrupted installation.</small></span><button class="secondary-button" title={status.maintenance.recover ? 'Finish an interrupted LazyDesigner setup.' : status.maintenance.blocked_reason ?? 'No interrupted setup was found.'} onclick={() => runManagedAction('recover')} disabled={!status.maintenance.recover || busyAction !== null}>Recover</button></div>
                    </div>
                  </details>
                {/if}
              </div>
            </section>

            <section class="support-group">
              <div class="group-copy"><h3>About</h3><p>Build identity for support requests.</p></div>
              <details class="technical-details">
                <summary><span><strong>Technical information</strong><small>Version and source identities</small></span><span>Details</span></summary>
                <div class="technical-list">
                  <div><span>Desktop version</span><code>0.1.0</code></div>
                  <div><span>Managed version</span><code>{status.managed?.installed?.source_sha?.slice(0, 12) ?? 'Unavailable'}</code></div>
                  <div><span>Observed</span><code>{new Date(status.observed_at_unix_ms).toLocaleTimeString()}</code></div>
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
    <div class="attention-icon">{error ? '!' : actionMessage ? '✓' : '•'}</div>
    <div class="attention-copy"><strong>{error ? 'Something needs attention' : actionMessage ? 'Done' : 'Working'}</strong><span>{error || actionMessage || progressLabel(progressStage)}</span></div>
    <div class="attention-actions">
      {#if activityVisible()}<button onclick={() => navigate('Activity')}>Activity</button>{/if}
      {#if error || actionMessage}<button class="dismiss" aria-label="Dismiss notification" onclick={() => { error = ''; clearSuccessToast(); }}>×</button>{/if}
    </div>
  </aside>
{/if}

<style>
  .loading-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;gap:14px;color:var(--muted);background:var(--bg)}.loading-copy{display:grid;gap:2px}.loading-copy strong{color:var(--text)}.loading-copy span{font-size:11px}.skip-link{position:fixed;z-index:1000;top:8px;left:8px;transform:translateY(-150%);padding:8px 11px;border:1px solid var(--accent);border-radius:8px;background:var(--surface);color:var(--text);font-weight:700;text-decoration:none}.skip-link:focus{transform:translateY(0)}
  .brand-mark{width:34px;height:34px;display:grid;place-items:center;border-radius:9px;background:var(--accent);color:var(--accent-ink);font-weight:900}.brand-lockup{display:flex;align-items:center;gap:10px}.desktop-shell{display:grid;grid-template-columns:220px minmax(0,1fr);width:100%;height:100vh;background:var(--bg)}.navigation{display:flex;flex-direction:column;padding:14px 11px;border-right:1px solid var(--border-soft);background:#0e1012}.navigation-brand{padding:2px 8px 16px}.navigation-spacer{flex:1}.navigation-footer{padding:10px 9px 2px;color:var(--muted-2);font-size:9px;text-transform:uppercase}
  .global-nav{display:grid;gap:3px}.global-nav button{position:relative;min-height:40px;display:flex;align-items:center;gap:10px;padding:0 10px;border-radius:8px;background:transparent;color:var(--muted);font-size:11px;font-weight:650;text-align:left;cursor:pointer}.global-nav button:hover{background:var(--surface);color:var(--text-soft)}.global-nav button.active{background:var(--surface-2);color:var(--text);box-shadow:var(--shadow-inset)}.nav-icon{width:18px;height:18px;display:grid;place-items:center}.nav-icon :global(svg){width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.activity-status{margin-left:auto;min-width:20px;height:20px;display:grid;place-items:center;padding:0 6px;border-radius:999px;background:var(--accent-soft);color:#9ee8b9;font-size:9px}.activity-status.error{background:var(--warning-bg);color:#fde68a}
  .main-view{min-width:0;height:100vh;display:flex;flex-direction:column;overflow:hidden}.page-toolbar{min-height:72px;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 30px;border-bottom:1px solid var(--border-soft);background:var(--bg)}.page-toolbar h1{margin:0;font-size:21px}.page-toolbar p{margin:3px 0 0;color:var(--muted);font-size:11px}.content{width:min(920px,calc(100% - 56px));margin:0 auto;padding:30px 0 48px;overflow:auto;min-height:0;flex:1}.centered-content{display:flex;flex-direction:column}.activity-page,.support-page{width:min(840px,100%)}
  .primary-button,.secondary-button{min-height:36px;border-radius:8px;padding:8px 13px;font-weight:650;cursor:pointer}.primary-button{border:1px solid var(--accent);background:var(--accent);color:var(--accent-ink)}.primary-button:hover:not(:disabled){background:var(--accent-hover)}.primary-button:active:not(:disabled){background:var(--accent-active)}.primary-button:focus-visible,.secondary-button:focus-visible,.text-action:focus-visible,.attention-actions button:focus-visible{outline:2px solid color-mix(in srgb,var(--accent) 72%,transparent);outline-offset:2px}.secondary-button{border:1px solid var(--border);background:var(--surface-2);color:var(--text)}.secondary-button:hover:not(:disabled){background:var(--surface-3)}
  .more-menu{position:relative}.more-menu summary{width:38px;height:38px;display:grid;place-items:center;list-style:none;border-radius:8px;color:var(--muted);cursor:pointer}.more-menu summary:hover{background:var(--surface-2);color:var(--text)}.more-menu[open] summary{background:var(--surface-2);color:var(--text)}.more-menu summary::-webkit-details-marker{display:none}.menu-popover{position:absolute;z-index:20;right:0;top:42px;width:180px;display:grid;padding:6px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);box-shadow:var(--shadow-popover)}.menu-popover button{width:100%;padding:8px 9px;border-radius:7px;background:transparent;color:var(--text-soft);text-align:left;cursor:pointer;font-size:10px}.menu-popover button:hover:not(:disabled){background:var(--surface-3)}
  .product-state{min-height:170px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:18px;padding:24px 24px 22px;border:1px solid var(--border-soft);border-radius:12px;background:var(--surface);box-shadow:var(--shadow-card)}.state-symbol{width:40px;height:40px;display:grid;place-items:center;border-radius:11px;background:var(--surface-2);color:var(--muted);font-size:18px;font-weight:800}.ready-state{border-color:color-mix(in srgb,var(--accent) 26%,var(--border-soft));background:linear-gradient(90deg,var(--accent-soft),transparent 42%),var(--surface)}.ready-state .state-symbol{background:var(--accent-soft);color:var(--accent)}.attention-state{border-color:#5b4a22;background:linear-gradient(90deg,rgba(242,201,76,.06),transparent 44%),var(--surface)}.attention-state .state-symbol{background:var(--warning-bg);color:var(--warning)}.setup-state{border-color:#36587d;background:linear-gradient(90deg,rgba(99,168,255,.06),transparent 44%),var(--surface)}.setup-state .state-symbol{background:rgba(99,168,255,.12);color:var(--info)}.state-copy h1,.state-copy h2{margin:0;font-size:20px;line-height:1.2;letter-spacing:-.02em}.state-copy p{max-width:540px;margin:6px 0 0;color:var(--muted);font-size:11px;line-height:1.55}.state-actions{display:flex;align-items:center;gap:8px}
  .quiet-summary{display:flex;align-items:center;gap:18px;margin-top:10px;padding:12px 14px;border:1px solid var(--border-soft);border-radius:9px;background:var(--bg-elevated)}.quiet-summary>div{display:grid;gap:2px}.quiet-label{color:var(--muted-2);font-size:8px;text-transform:uppercase;letter-spacing:.04em}.quiet-summary strong{font-size:11px}.quiet-divider{width:1px;height:26px;background:var(--border-soft)}.text-action{width:max-content;margin:6px 2px 0;padding:4px 0;background:transparent;color:var(--muted);font-size:10px;cursor:pointer}.text-action:hover{color:var(--text-soft)}.guidance-card{margin:12px 0 0;padding:13px 14px;border:1px solid #5f5125;border-radius:9px;background:var(--warning-bg)}.guidance-card strong{font-size:10px}.guidance-card p{margin:4px 0 0;color:var(--text-soft);font-size:10px;line-height:1.5}.update-callout{display:flex;align-items:center;justify-content:space-between;gap:24px;margin:14px 0 0;padding:14px;border:1px solid var(--accent-border);border-radius:10px;background:var(--accent-soft)}.update-callout>div{display:grid;gap:3px}.update-callout strong{font-size:11px}.update-callout span{color:var(--muted);font-size:10px}
  .onboarding-card{margin:12px 0 0;padding:13px;border:1px solid var(--border-soft);border-radius:10px;background:var(--bg-elevated)}.onboarding-card.compact{padding:11px 13px}.onboarding-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:11px}.onboarding-heading strong{font-size:10px}.onboarding-heading span{color:var(--muted-2);font-size:8px;text-transform:uppercase;letter-spacing:.04em}.setup-steps{display:grid;gap:7px}.setup-step{display:flex;align-items:flex-start;gap:10px;padding:9px 10px;border:1px solid var(--border-soft);border-radius:8px;background:var(--surface)}.setup-step>span{width:22px;height:22px;display:grid;place-items:center;flex:0 0 auto;border-radius:50%;background:var(--surface-3);color:var(--muted);font-size:9px;font-weight:800}.setup-step.current>span{background:rgba(99,168,255,.12);color:var(--info)}.setup-step>div{display:grid;gap:2px}.setup-step strong{font-size:10px}.setup-step small{color:var(--muted);font-size:9px;line-height:1.4}
  .operation-list{display:grid;gap:8px}.operation-card{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:11px;align-items:center;min-height:54px;padding:10px 12px;border:1px solid var(--border-soft);border-radius:9px;background:var(--surface)}.status-dot{width:8px;height:8px;border-radius:50%;background:#697078}.status-dot.running{background:var(--accent)}.status-dot.transition{background:var(--info)}.status-dot.danger{background:var(--danger)}.operation-card>div{display:grid;gap:2px}.operation-card strong{font-size:10px}.operation-card span{color:var(--muted);font-size:9px}.result-label{color:#9ee8b9!important;font-size:9px!important;font-weight:700}.result-label.danger-text{color:#ff9aa2!important}.operation-state{color:var(--info)!important;font-weight:700}.active-operation{margin-bottom:10px;border-color:#36587d}.empty-state{min-height:280px;display:grid;place-content:center;justify-items:center;text-align:center}.empty-icon{width:46px;height:46px;display:grid;place-items:center;border-radius:12px;background:var(--surface-2);margin-bottom:12px}.empty-icon :global(svg){width:21px;height:21px;fill:none;stroke:var(--muted);stroke-width:1.8}.empty-state h2{margin:0;font-size:15px}.empty-state p{margin:5px 0 0;color:var(--muted);font-size:10px}
  .support-group{display:grid;grid-template-columns:180px minmax(0,1fr);gap:28px;padding:22px 0;border-top:1px solid var(--border-soft)}.support-group:first-child{border-top:0;padding-top:0}.group-copy h3{margin:0;font-size:12px}.group-copy p{margin:5px 0 0;color:var(--muted);font-size:10px;line-height:1.5}.support-stack{display:grid;gap:9px}.support-card{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:14px;border:1px solid var(--border-soft);border-radius:10px;background:var(--surface)}.support-card>div{display:grid;gap:3px}.support-card strong{font-size:11px}.support-card span{color:var(--muted);font-size:10px;line-height:1.45}.support-overview{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.support-overview>div{display:grid;gap:3px;padding:11px 12px;border:1px solid var(--border-soft);border-radius:9px;background:var(--surface)}.support-overview span{color:var(--muted-2);font-size:8px;text-transform:uppercase}.support-overview strong{font-size:10px}.troubleshooting-details,.technical-details{border:1px solid var(--border-soft);border-radius:10px;background:var(--surface)}.troubleshooting-details summary,.technical-details summary{display:flex;align-items:center;justify-content:space-between;padding:11px 12px;list-style:none;cursor:pointer}.troubleshooting-details summary::-webkit-details-marker,.technical-details summary::-webkit-details-marker{display:none}.troubleshooting-details summary>span:first-child,.technical-details summary>span:first-child{display:grid;gap:2px}.troubleshooting-details small,.technical-details small{color:var(--muted);font-size:9px}.recovery-list,.technical-list{display:grid;border-top:1px solid var(--border-soft)}.recovery-list>div{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:11px 12px;border-bottom:1px solid var(--border-soft)}.recovery-list>div:last-child{border-bottom:0}.recovery-list>div>span{display:grid;gap:2px}.recovery-list strong{font-size:10px}.recovery-list small{color:var(--muted);font-size:9px}.technical-list>div{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:9px 12px;border-bottom:1px solid var(--border-soft)}.technical-list>div:last-child{border-bottom:0}.technical-list span{color:var(--muted);font-size:9px}.technical-list code{font:9px ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--text-soft)}
  .operation-attention{position:fixed;animation:attention-in 140ms ease-out;z-index:220;right:20px;bottom:20px;width:min(410px,calc(100vw - 40px));display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:11px;align-items:start;padding:13px;border:1px solid var(--border);border-radius:11px;background:var(--surface-2);box-shadow:var(--shadow-popover)}.operation-attention.success{border-color:var(--accent-border)}.operation-attention.error{border-color:#705c26}.attention-icon{width:28px;height:28px;display:grid;place-items:center;border-radius:8px;background:var(--surface-3);font-weight:800}.success .attention-icon{background:var(--accent-soft);color:#9ee8b9}.error .attention-icon{background:var(--warning-bg);color:#fde68a}.attention-copy{display:grid;gap:3px}.attention-copy strong{font-size:11px}.attention-copy span{color:var(--muted);font-size:10px;line-height:1.45}.attention-actions{display:flex;gap:5px}.attention-actions button{min-height:30px;padding:6px 9px;border:1px solid var(--border);border-radius:7px;background:var(--surface-3);font-size:9px;font-weight:700;cursor:pointer}.attention-actions .dismiss{width:30px;padding:0;border:0;background:transparent;color:var(--muted);font-size:18px}
  @keyframes attention-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @media(max-width:760px){.desktop-shell{grid-template-columns:72px minmax(0,1fr)}.navigation-brand strong,.global-nav button>span:not(.nav-icon):not(.activity-status),.navigation-footer{display:none}.navigation{padding-inline:10px}.navigation-brand{justify-content:center;padding-inline:0}.global-nav button{justify-content:center;padding:0}.activity-status{position:absolute;right:2px;top:2px}.page-toolbar{padding:14px 18px}.content{width:calc(100% - 28px);padding-top:22px}.product-state{grid-template-columns:1fr;min-height:0;padding:22px 18px}.quiet-summary{margin-top:10px;padding-inline:14px}.text-action{margin-left:2px}.update-callout,.onboarding-card{margin-inline:0}.support-group{grid-template-columns:1fr;gap:10px}.support-card,.recovery-list>div{align-items:flex-start;flex-direction:column}.support-overview{grid-template-columns:1fr}.support-overview>div{border-right:0;border-bottom:1px solid var(--border-soft)}.support-overview>div:nth-last-child(-n+2){border-bottom:1px solid var(--border-soft)}.support-overview>div:last-child{border-bottom:0}.operation-attention{right:12px;bottom:12px;width:calc(100vw - 24px);grid-template-columns:auto minmax(0,1fr)}.attention-actions{grid-column:2}}
</style>
