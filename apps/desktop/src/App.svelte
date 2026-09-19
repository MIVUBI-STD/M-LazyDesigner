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

  type ConnectionStatus = {
    schema: number;
    observed_at_unix_ms: number;
    blockbench_running: boolean;
    runtime_online: boolean | null;
    gateway_active: boolean | null;
    plugin_integrity: 'ready' | 'missing' | 'modified' | 'invalid' | 'unknown';
  };

  type SystemStatus = {
    schema: number;
    product_state: ProductMode;
    plugin_integrity: 'ready' | 'missing' | 'modified' | 'invalid' | 'unknown';
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

  type ManagedActionResult = {
    action: 'update' | 'rollback' | 'recover' | 'repair' | 'setup-tls';
    receipt: Record<string, unknown>;
  };

  type EnsureReadyResult = {
    status: 'READY' | 'RUNTIME_READY' | 'APPROVAL_REQUIRED' | 'NEEDS_ATTENTION';
    reason: string;
    runtime_online: boolean;
    gateway_active: boolean;
    blockbench_running: boolean;
    plugin_integrity: 'ready' | 'missing' | 'modified' | 'invalid' | 'unknown';
    manual_plugin_approval_recommended: boolean;
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
  let busyAction: 'install' | 'connect-blockbench' | 'update' | 'rollback' | 'recover' | 'repair' | 'setup-tls' | 'show-plugin' | 'export-diagnostics' | null = null;
  let pluginApprovalNeeded = false;
  let readinessReason = '';
  let actionMessage = '';
  let progressStage = '';
  let stopProgressListener: (() => void) | null = null;
  let successToastTimer: number | null = null;
  let utilityMenuOpen = false;
  let statusWatcherTimer: number | null = null;
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
      if (status && devFixture) status = applyDevFixture(status, devFixture);
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      loading = false;
    }
  }

  async function watchSystemStatus() {
    if (devFixture || busyAction || document.hidden || !status) return;
    try {
      const candidate = await invoke<ConnectionStatus>('connection_status');
      if (candidate.runtime_online === null || candidate.gateway_active === null) return;

      const changed =
        candidate.blockbench_running !== status.blockbench.running
        || candidate.plugin_integrity !== status.plugin_integrity
        || candidate.runtime_online !== status.managed?.runtime_online
        || candidate.gateway_active !== status.managed?.gateway_active;

      if (changed) await refresh();
    } catch {
      // Preserve the last known full Rust projection on transient probe failure.
    }
  }

  async function connectBlockbench() {
    if (devFixture) return;
    if (!status?.manager_available || busyAction) return;
    closeUtilityMenu();
    busyAction = 'connect-blockbench';
    error = '';
    clearSuccessToast();
    try {
      const result = await invoke<EnsureReadyResult>('ensure_ready');
      pluginApprovalNeeded = result.manual_plugin_approval_recommended;
      readinessReason = result.reason;
      await refresh();
      if (result.status === 'READY') {
        showSuccessToast('LazyDesigner is ready.');
      } else if (result.status === 'RUNTIME_READY') {
        showSuccessToast('Blockbench is ready. The MCP client can connect when needed.');
      } else if (result.status === 'NEEDS_ATTENTION' && result.reason !== 'PLUGIN_MISSING_WHILE_BLOCKBENCH_RUNNING') {
        error = result.reason === 'PLUGIN_INTEGRITY'
          ? 'The managed Blockbench plugin was modified and needs review.'
          : result.reason === 'BLOCKBENCH_EXITED'
            ? 'Blockbench closed before LazyDesigner could become ready.'
            : result.reason === 'CONNECTION_PROBE_UNKNOWN'
              ? 'LazyDesigner could not verify the local Runtime connection. Try again or open Support.'
              : 'LazyDesigner could not prepare Blockbench automatically.';
      }
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busyAction = null;
    }
  }

  async function installLazyDesigner() {
    if (devFixture) return;
    if (!status?.bootstrap_available || status.manager_available || busyAction) return;
    busyAction = 'install';
    error = '';
    clearSuccessToast();
    try {
      const result = await invoke<BootstrapActionResult>('bootstrap_install');
      const receiptStatus = typeof result.receipt.status === 'string' ? result.receipt.status : 'INSTALLED';
      recordOperation('Install LazyDesigner', 'success', receiptStatus);
      await refresh();
      const ready = await invoke<EnsureReadyResult>('ensure_ready');
      pluginApprovalNeeded = ready.manual_plugin_approval_recommended;
      readinessReason = ready.reason;
      await refresh();
      if (ready.status === 'READY') showSuccessToast('Setup complete. LazyDesigner is ready.');
      else if (ready.status === 'RUNTIME_READY') showSuccessToast('Setup complete. Blockbench is ready.');
      else if (ready.status === 'NEEDS_ATTENTION') {
        error = ready.reason === 'PLUGIN_INTEGRITY'
          ? 'Setup completed, but the managed Blockbench plugin needs review.'
          : 'Setup completed, but Blockbench could not become ready automatically.';
      }
    } catch (cause) {
      recordOperation('Install LazyDesigner', 'failed', errorCode(cause));
      error = errorMessage(cause);
    } finally {
      busyAction = null;
    }
  }

  async function showPluginFile() {
    if (devFixture) return;
    if (!status?.manager_available || busyAction) return;
    closeUtilityMenu();
    busyAction = 'show-plugin';
    error = '';
    try {
      await invoke<PluginFileActionResult>('show_plugin_file');
      showSuccessToast('Plugin file highlighted. Approve it once in Blockbench to complete setup.');
    } catch (cause) {
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
    if (devFixture) return;
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
    const onVisibilityChange = () => {
      if (!document.hidden) void watchSystemStatus();
    };
    const onFocus = () => { void watchSystemStatus(); };
    devFixture = devFixtureFromLocation();
    if (devFixture === 'approval-required') {
      pluginApprovalNeeded = true;
      readinessReason = 'RUNTIME_TIMEOUT_WITH_HEALTHY_PLUGIN';
    } else if (devFixture === 'plugin-missing') {
      readinessReason = 'PLUGIN_MISSING_WHILE_BLOCKBENCH_RUNNING';
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    void refresh().then(() => watchSystemStatus());
    statusWatcherTimer = window.setInterval(() => { void watchSystemStatus(); }, 3000);
    void listen<ManagedProgress>('managed-progress', event => {
      if (busyAction && event.payload.action === busyAction) progressStage = event.payload.stage;
    }).then(unlisten => { stopProgressListener = unlisten; });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (statusWatcherTimer !== null) window.clearInterval(statusWatcherTimer);
    };
  });

  onDestroy(() => {
    stopProgressListener?.();
    if (successToastTimer !== null) window.clearTimeout(successToastTimer);
    if (statusWatcherTimer !== null) window.clearInterval(statusWatcherTimer);
  });

  const compatibilityLabel = (value: Compatibility['status'] | undefined) => {
    if (value === 'validated') return 'Validated';
    if (value === 'compatible-unverified') return 'Compatible · unverified';
    if (value === 'review-required') return 'Review required';
    if (value === 'unsupported') return 'Unsupported';
    if (value === 'invalid') return 'Unknown version';
    return 'Unavailable';
  };

  type ProductMode = 'welcome' | 'security-setup' | 'unsupported' | 'ready-start' | 'plugin-setup' | 'client-wait' | 'ready' | 'attention';

  type DevFixture = 'ready' | 'fresh-install' | 'approval-required' | 'plugin-missing' | 'plugin-modified' | 'runtime-offline' | 'client-wait' | 'unsupported' | 'repair-blocked';
  let devFixture: DevFixture | null = null;

  function applyDevFixture(base: SystemStatus, fixture: DevFixture): SystemStatus {
    const next = structuredClone(base);
    const runtimeOnline = ['ready', 'client-wait', 'repair-blocked'].includes(fixture);
    const gatewayActive = ['ready', 'repair-blocked'].includes(fixture);

    next.manager_available = fixture !== 'fresh-install';
    next.bootstrap_available = true;
    next.plugin_integrity = fixture === 'plugin-missing' ? 'missing' : fixture === 'plugin-modified' ? 'modified' : 'ready';
    next.blockbench.running = fixture !== 'fresh-install';
    next.blockbench.version = next.blockbench.version ?? '5.2.0';
    next.blockbench.compatibility = {
      status: fixture === 'unsupported' ? 'unsupported' : 'validated',
      minimum_version: next.blockbench.compatibility?.minimum_version ?? '5.2.0',
      review_boundary_version: next.blockbench.compatibility?.review_boundary_version ?? '5.3.0',
      source_type_baseline: next.blockbench.compatibility?.source_type_baseline ?? 'desktop',
      live_validated: fixture !== 'unsupported',
    };

    next.managed = fixture === 'fresh-install' ? null : {
      schema: 1,
      installed: next.managed?.installed ?? { source_sha: '0000000000000000000000000000000000000000' },
      pending: false,
      gateway_active: gatewayActive,
      runtime_online: runtimeOnline,
      tls_ready: true,
      tls_error: null,
      rollback: { available: false, previous_source_sha: null, transaction: null },
    };

    next.gateway = {
      ownership: 'client-owned',
      state: fixture === 'ready' ? 'healthy'
        : fixture === 'client-wait' ? 'client-disconnected'
        : fixture === 'repair-blocked' ? 'healthy'
        : fixture === 'runtime-offline' || fixture === 'approval-required' || fixture === 'plugin-missing' ? 'runtime-offline'
        : 'idle',
      action: null,
    };

    next.readiness = {
      ready: fixture === 'ready',
      state: fixture === 'ready' ? 'ready'
        : fixture === 'fresh-install' ? 'setup-required'
        : fixture === 'client-wait' || fixture === 'runtime-offline' || fixture === 'approval-required' || fixture === 'plugin-missing' ? 'needs-connection'
        : 'needs-attention',
      summary: fixture === 'ready' ? 'LazyDesigner is ready.' : 'Fixture state.',
    };

    next.product_state = fixture === 'ready' ? 'ready'
      : fixture === 'fresh-install' ? 'welcome'
      : fixture === 'unsupported' ? 'unsupported'
      : fixture === 'plugin-modified' ? 'attention'
      : fixture === 'client-wait' ? 'client-wait'
      : fixture === 'repair-blocked' ? 'attention'
      : fixture === 'runtime-offline' || fixture === 'approval-required' || fixture === 'plugin-missing' ? 'plugin-setup'
      : 'attention';

    next.maintenance = {
      ...next.maintenance,
      update: fixture !== 'fresh-install',
      repair: fixture !== 'repair-blocked' && fixture !== 'fresh-install',
      recover: fixture !== 'repair-blocked' && fixture !== 'fresh-install',
      setup_tls: false,
      blocked_reason: fixture === 'repair-blocked' ? 'Runtime or Gateway is active.' : null,
    };
    return next;
  }

  function devFixtureFromLocation(): DevFixture | null {
    if (!import.meta.env.DEV) return null;
    const value = new URLSearchParams(window.location.search).get('fixture');
    const allowed: DevFixture[] = ['ready','fresh-install','approval-required','plugin-missing','plugin-modified','runtime-offline','client-wait','unsupported','repair-blocked'];
    return allowed.includes(value as DevFixture) ? value as DevFixture : null;
  }

  const productMode = (value: SystemStatus): ProductMode => value.product_state;

  function productHeadline(value: SystemStatus) {
    const mode = productMode(value);
    if (mode === 'welcome') return 'Welcome to LazyDesigner';
    if (mode === 'security-setup') return 'Finish setup';
    if (mode === 'unsupported') return 'Blockbench version not supported';
    if (mode === 'ready-start') return 'Ready to start';
    if (mode === 'plugin-setup') return 'Connect LazyDesigner to Blockbench';
    if (mode === 'client-wait') return 'Blockbench ready';
    if (mode === 'ready') return 'Ready to use';
    return 'Action required';
  }

  function productMessage(value: SystemStatus) {
    const mode = productMode(value);
    if (mode === 'welcome') return 'Set up LazyDesigner once, then continue your work in Blockbench.';
    if (mode === 'security-setup') return 'Complete the secure local setup required for LazyDesigner to connect safely.';
    if (mode === 'unsupported') return 'This Blockbench version cannot be used safely with the current LazyDesigner build.';
    if (mode === 'ready-start') return 'Everything is installed. Open Blockbench when you are ready to work.';
    if (mode === 'plugin-setup') return 'LazyDesigner will try to connect to Blockbench automatically.';
    if (mode === 'client-wait') return 'LazyDesigner is active in Blockbench and will connect when an MCP client starts a session.';
    if (mode === 'ready') return 'Everything is working. Continue in Blockbench.';
    return value.readiness.summary;
  }

  function productGuidance(value: SystemStatus) {
    const mode = productMode(value);
    if (mode === 'welcome' && !value.bootstrap_available) return 'This Desktop build does not contain the setup package. Open Support and export diagnostics.';
    if (mode === 'security-setup' && !value.maintenance.setup_tls) return value.maintenance.blocked_reason ?? 'Secure setup is temporarily unavailable. Close active authoring tasks and try again.';
    if (mode === 'unsupported') return 'Update Blockbench to a supported version, then refresh this page.';
    if (mode === 'plugin-setup' && pluginApprovalNeeded) return 'Blockbench needs one-time approval for the LazyDesigner plugin.';
    if (mode === 'attention' && value.plugin_integrity === 'modified') return 'The managed Blockbench plugin was modified. Review or repair it before starting Blockbench.';
    if (mode === 'attention' && value.plugin_integrity === 'invalid') return 'The managed Blockbench plugin state is invalid. Open Support for recovery.';
    if (mode === 'attention') return value.gateway.action ?? value.blockbench.diagnostic ?? value.diagnostic ?? 'Open Support for troubleshooting tools.';
    return null;
  }




</script>

{#snippet navIcon(item: Page)}
  {#if item === 'Overview'}
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="4.5" width="15" height="15" rx="2.5"/><path d="M8 9h8M8 13h5"/></svg>
  {:else}
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5h14M7.5 11h9M9.5 15.5h5"/><circle cx="12" cy="19" r="1"/></svg>
  {/if}
{/snippet}

{#snippet blockbenchIcon()}
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 7.5 4.3v9.4L12 21l-7.5-4.3V7.3L12 3Z"/><path d="m4.5 7.3 7.5 4.4 7.5-4.4M12 11.7V21"/></svg>
{/snippet}

{#if loading && !status}
  <main class="loading-screen" aria-live="polite">
    <span class="loading-spinner"></span>
    <span>Loading LazyDesigner…</span>
  </main>
{:else}
  <a class="skip-link" href="#main-content">Skip to content</a>

  <div class="desktop-shell">
    <aside class="navigation" aria-label="LazyDesigner navigation">
      <div class="navigation-brand">
        <span class="brand-mark" aria-hidden="true"></span>
        <strong>LazyDesigner</strong>
      </div>

      <nav class="global-nav">
        <button class:active={page === 'Overview'} aria-current={page === 'Overview' ? 'page' : undefined} onclick={() => navigate('Overview')}>
          <span class="nav-icon">{@render navIcon('Overview')}</span><span>Overview</span>
        </button>
      </nav>

      <div class="navigation-spacer"></div>

      <button class:active={page === 'Support'} class="support-nav" aria-current={page === 'Support' ? 'page' : undefined} onclick={() => navigate('Support')}>
        <span class="nav-icon">{@render navIcon('Support')}</span><span>Support</span>
      </button>
    </aside>

    <section id="main-content" class="main-view" tabindex="-1">
      <header class="page-toolbar">
        <h1>{page}</h1>
        <div class="toolbar-actions">
          {#if devFixture}<span class="fixture-badge">Fixture · {devFixture}</span>{/if}
          {#if page === 'Overview'}
            <details class="more-menu" bind:open={utilityMenuOpen}>
              <summary aria-label="More actions" aria-haspopup="menu" aria-expanded={utilityMenuOpen}>•••</summary>
              <div class="menu-popover" role="menu">
                <button role="menuitem" disabled={loading || busyAction !== null} onclick={refresh}>Refresh</button>
                {#if status?.manager_available}<button role="menuitem" disabled={busyAction !== null} onclick={showPluginFile}>Show plugin file</button>{/if}
                <button role="menuitem" disabled={busyAction !== null} onclick={exportDiagnostics}>Export diagnostics</button>
              </div>
            </details>
          {/if}
        </div>
      </header>

      {#if !status}
        <main class="page-content">
          <section class="message-state">
            <div class="message-icon danger">!</div>
            <div class="message-copy">
              <h2>LazyDesigner is unavailable</h2>
              <p>Desktop could not read the local LazyDesigner state.</p>
            </div>
            <button class="primary-button" onclick={refresh} disabled={loading}>Try again</button>
          </section>
        </main>

      {:else if page === 'Overview'}
        <main class="page-content">
          {#if busyAction && progressStage}
            <section class="task-strip" aria-live="polite">
              <span class="task-spinner"></span>
              <span>{busyAction === 'update' ? 'Updating LazyDesigner' : busyAction === 'rollback' ? 'Restoring previous version' : busyAction === 'repair' ? 'Repairing LazyDesigner' : busyAction === 'recover' ? 'Finishing setup' : busyAction === 'setup-tls' ? 'Finishing setup' : busyAction === 'connect-blockbench' ? 'Connecting to Blockbench' : 'Working'}</span>
              <small>{progressLabel(progressStage)}</small>
            </section>
          {/if}

          {#if productMode(status) === 'welcome'}
            <section class="setup-panel">
              <div class="setup-copy">
                <h2>Set up LazyDesigner</h2>
                <p>Desktop will install the required components, open Blockbench, and verify the connection automatically.</p>
              </div>

              <div class="setup-steps">
                <div class="setup-step active">
                  <span class="step-number">1</span>
                  <div><strong>Prepare workstation</strong><span>Install LazyDesigner, open Blockbench, and verify the local Runtime.</span></div>
                </div>
                <div class="setup-step">
                  <span class="step-number">2</span>
                  <div><strong>Ready to work</strong><span>After the one-time Blockbench trust approval, future launches connect automatically.</span></div>
                </div>
              </div>

              <div class="setup-footer">
                {#if productGuidance(status)}<span class="setup-warning">{productGuidance(status)}</span>{:else}<span></span>{/if}
                <button class="primary-button" onclick={installLazyDesigner} disabled={!status.bootstrap_available || busyAction !== null}>{busyAction === 'install' ? 'Setting up…' : 'Set up'}</button>
              </div>
            </section>

          {:else}
            <section class="content-section">
              <div class="section-heading">
                <div><h2>Blockbench</h2><p>Editor connection and launch status</p></div>
              </div>

              <div class="resource-list">
                <div class="resource-row">
                  <div class="app-icon">{@render blockbenchIcon()}</div>

                  <div class="resource-main">
                    <div class="resource-title">Blockbench</div>
                    <div class="resource-meta">
                      <span>{status.blockbench.version ?? 'Version unavailable'}</span>
                      <span class="meta-separator">·</span>
                      <span class:status-good={productMode(status) === 'ready' || productMode(status) === 'client-wait'} class:status-warning={productMode(status) === 'plugin-setup' || productMode(status) === 'unsupported'}>
                        {productMode(status) === 'ready' ? 'Connected' : productMode(status) === 'client-wait' ? 'Ready' : status.blockbench.running ? 'Running' : 'Not running'}
                      </span>
                    </div>
                  </div>

                  <div class="resource-actions">
                    {#if productMode(status) === 'ready'}
                      <button class="secondary-button" onclick={connectBlockbench} disabled={busyAction !== null}>Open</button>
                    {:else if productMode(status) === 'ready-start'}
                      <button class="primary-button" onclick={connectBlockbench} disabled={busyAction !== null}>{busyAction === 'connect-blockbench' ? 'Preparing…' : 'Open'}</button>
                    {:else if productMode(status) === 'plugin-setup'}
                      <button class="secondary-button" onclick={connectBlockbench} disabled={busyAction !== null}>Open</button>
                    {:else if productMode(status) === 'unsupported'}
                      <button class="secondary-button" onclick={refresh} disabled={loading || busyAction !== null}>Check again</button>
                    {:else}
                      <button class="secondary-button" onclick={connectBlockbench} disabled={busyAction !== null}>Open</button>
                    {/if}
                    <button class="icon-button" aria-label="Blockbench actions" onclick={showPluginFile} disabled={!status.manager_available || busyAction !== null}>•••</button>
                  </div>
                </div>
              </div>

              {#if productMode(status) === 'plugin-setup'}
                <div class="inline-guidance">
                  {#if !pluginApprovalNeeded}
                    <div>
                      <strong>LazyDesigner is not active yet</strong>
                      <span>Desktop can open Blockbench and verify the Runtime automatically.</span>
                    </div>
                    <button class="primary-button" onclick={connectBlockbench} disabled={busyAction !== null}>{busyAction === 'connect-blockbench' ? 'Preparing…' : 'Prepare Blockbench'}</button>
                  {:else if readinessReason === 'PLUGIN_MISSING_WHILE_BLOCKBENCH_RUNNING'}
                    <div>
                      <strong>Restart Blockbench to repair LazyDesigner</strong>
                      <span>Close Blockbench normally so LazyDesigner can restore the missing plugin safely. Your unsaved work is never closed automatically.</span>
                    </div>
                  {:else}
                    <div>
                      <strong>One-time approval required</strong>
                      <span>Blockbench requires your approval before a local plugin can run. This is only needed once.</span>
                    </div>
                    {#if readinessReason !== 'PLUGIN_MISSING_WHILE_BLOCKBENCH_RUNNING'}
                      <ol>
                        <li>Choose Plugins → Load Plugin from File in Blockbench.</li>
                        <li>Select the highlighted LazyDesigner plugin.</li>
                        <li>Approve the Blockbench trust prompt.</li>
                      </ol>
                      <button class="primary-button" onclick={showPluginFile} disabled={busyAction !== null}>{busyAction === 'show-plugin' ? 'Opening…' : 'Show approval file'}</button>
                    {/if}
                  {/if}
                </div>
              {:else if productMode(status) === 'unsupported'}
                <div class="inline-alert danger-alert"><strong>Unsupported Blockbench version</strong><span>Update Blockbench to a supported version before continuing.</span></div>
              {/if}
            </section>

            <section class="content-section">
              <div class="section-heading">
                <div><h2>LazyDesigner</h2><p>Local service status</p></div>
              </div>

              <div class="definition-rows">
                <div class="definition-row">
                  <span>Status</span>
                  <strong class:status-good={productMode(status) === 'ready' || productMode(status) === 'client-wait'} class:status-warning={productMode(status) !== 'ready' && productMode(status) !== 'client-wait'}>
                    {productMode(status) === 'ready' ? 'Ready' : productMode(status) === 'client-wait' ? 'Waiting for MCP client' : productHeadline(status)}
                  </strong>
                </div>
                <div class="definition-row">
                  <span>Version</span>
                  <strong>0.1.0</strong>
                </div>
                {#if status.managed?.pending}
                  <div class="definition-row update-definition">
                    <span>Update</span>
                    <div class="inline-action"><strong>Available</strong><button class="secondary-button small-button" onclick={() => runManagedAction('update')} disabled={!status.maintenance.update || busyAction !== null}>{busyAction === 'update' ? 'Updating…' : 'Update'}</button></div>
                  </div>
                {/if}
              </div>

              {#if productMode(status) === 'security-setup'}
                <div class="inline-alert"><div><strong>Finish setup</strong><span>Complete the secure local connection before using LazyDesigner.</span></div><button class="primary-button small-button" onclick={() => runManagedAction('setup-tls')} disabled={!status.maintenance.setup_tls || busyAction !== null}>Finish setup</button></div>
              {:else if productMode(status) === 'client-wait'}
                <div class="inline-note"><strong>Blockbench Runtime is ready.</strong><span>The MCP client owns the Gateway connection and can attach when needed.</span></div>
              {:else if productMode(status) === 'attention'}
                <div class="inline-alert"><div><strong>Action required</strong><span>{productGuidance(status) ?? status.readiness.summary}</span></div><button class="secondary-button small-button" onclick={() => navigate('Support')}>Open Support</button></div>
              {/if}
            </section>
          {/if}
        </main>

      {:else}
        <main class="page-content settings-content">
          {#if productMode(status) !== 'ready'}
            <div class="support-banner">
              <span class="support-banner-dot"></span>
              <div><strong>{productHeadline(status)}</strong><span>{productMessage(status)}</span></div>
            </div>
          {/if}

          <section class="settings-section">
            <h2>About</h2>
            <div class="definition-rows">
              <div class="definition-row"><span>LazyDesigner version</span><strong>0.1.0</strong></div>
              <div class="definition-row"><span>Blockbench version</span><strong>{status.blockbench.version ?? 'Unavailable'}</strong></div>
              {#if status.managed?.installed?.source_sha}<div class="definition-row"><span>Managed build</span><code>{status.managed.installed.source_sha.slice(0,12)}</code></div>{/if}
              {#if status.plugin_integrity !== 'ready'}<div class="definition-row"><span>Blockbench plugin</span><strong class="status-warning">{status.plugin_integrity === 'missing' ? 'Repairing / missing' : status.plugin_integrity === 'modified' ? 'Modified' : 'Needs attention'}</strong></div>{/if}
            </div>
          </section>

          <section class="settings-section">
            <h2>Troubleshooting</h2>
            <div class="settings-row">
              <div><strong>Export diagnostics</strong><span>Create a local troubleshooting snapshot. Nothing is uploaded automatically.</span></div>
              <button class="secondary-button" onclick={exportDiagnostics} disabled={busyAction !== null}>{busyAction === 'export-diagnostics' ? 'Exporting…' : 'Export'}</button>
            </div>

            {#if status.blockbench.compatibility?.status === 'unsupported' || status.blockbench.compatibility?.status === 'invalid'}
              <div class="settings-row compact"><div><strong>Blockbench support</strong><span>{compatibilityLabel(status.blockbench.compatibility?.status)}</span></div></div>
            {/if}
            {#if status.manager_available && status.managed?.tls_ready === false}
              <div class="settings-row compact"><div><strong>Local security</strong><span>Needs setup</span></div></div>
            {/if}

            {#if status.manager_available}
              <details class="advanced-recovery">
                <summary><span><strong>Advanced recovery</strong><small>Use only if normal setup or updates cannot finish.</small></span><span>Show</span></summary>
                <div class="recovery-list">
                  <div><span><strong>Restore previous version</strong><small>{status.maintenance.rollback ? 'Return to the last verified version.' : 'No previous version is available.'}</small></span><button class="secondary-button small-button" onclick={() => runManagedAction('rollback')} disabled={!status.maintenance.rollback || busyAction !== null}>Restore</button></div>
                  <div><span><strong>Repair LazyDesigner</strong><small>{status.maintenance.repair ? 'Restore missing files from the current installation.' : 'Repair is not available right now.'}</small></span><button class="secondary-button small-button" onclick={() => runManagedAction('repair')} disabled={!status.maintenance.repair || busyAction !== null}>Repair</button></div>
                  <div><span><strong>Finish incomplete setup</strong><small>{status.maintenance.recover ? 'Recover an interrupted installation.' : 'No interrupted setup was found.'}</small></span><button class="secondary-button small-button" onclick={() => runManagedAction('recover')} disabled={!status.maintenance.recover || busyAction !== null}>Recover</button></div>
                </div>
              </details>
            {/if}
          </section>

          {#if operations.length > 0}
            <section class="settings-section">
              <details class="recent-activity">
                <summary><span><strong>Recent activity</strong><small>Current Desktop session</small></span><span>Show</span></summary>
                <div class="recent-list">
                  {#each operations as operation}
                    <div><span>{operation.action}</span><strong class:failed={operation.outcome === 'failed'}>{operation.outcome === 'success' ? 'Completed' : 'Failed'}</strong></div>
                  {/each}
                </div>
              </details>
            </section>
          {/if}
        </main>
      {/if}
    </section>
  </div>
{/if}

{#if error || actionMessage || (busyAction && progressStage && busyAction !== 'repair')}
  <aside class:error={Boolean(error)} class:success={Boolean(actionMessage) && !error} class="operation-attention" aria-live={error ? 'assertive' : 'polite'}>
    <div class="attention-icon">{error ? '!' : actionMessage ? '✓' : '•'}</div>
    <div class="attention-copy"><strong>{error ? 'Something needs attention' : actionMessage ? 'Done' : 'Working'}</strong><span>{error || actionMessage || progressLabel(progressStage)}</span></div>
    <div class="attention-actions">
      {#if error}<button onclick={() => navigate('Support')}>Support</button>{/if}
      {#if error || actionMessage}<button class="dismiss" aria-label="Dismiss notification" onclick={() => { error=''; clearSuccessToast(); }}>×</button>{/if}
    </div>
  </aside>
{/if}

<style>
  .loading-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;gap:10px;background:var(--bg);color:var(--muted);font-size:11px}.loading-spinner{width:12px;height:12px;border:2px solid var(--surface-4);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}
  .skip-link{position:fixed;z-index:1000;top:8px;left:8px;transform:translateY(-150%);padding:8px 10px;border:1px solid var(--accent);border-radius:7px;background:var(--surface);color:var(--text);font-weight:700;text-decoration:none}.skip-link:focus{transform:translateY(0)}
  .desktop-shell{display:grid;grid-template-columns:168px minmax(0,1fr);width:100%;height:100vh;background:var(--bg)}
  .navigation{display:flex;flex-direction:column;padding:12px 9px;border-right:1px solid var(--border-soft);background:#0f1113}.navigation-brand{display:flex;align-items:center;gap:9px;padding:7px 8px 18px}.navigation-brand strong{font-size:12px;font-weight:700;letter-spacing:-.01em}.brand-mark{width:10px;height:10px;border-radius:3px;background:var(--accent)}.global-nav{display:grid;gap:2px}.global-nav button,.support-nav{min-height:36px;display:flex;align-items:center;gap:9px;padding:0 9px;border-radius:7px;background:transparent;color:var(--muted);font-size:11px;font-weight:600;text-align:left;cursor:pointer}.global-nav button:hover,.support-nav:hover{background:var(--surface);color:var(--text-soft)}.global-nav button.active,.support-nav.active{background:var(--surface);color:var(--text)}.nav-icon{width:17px;height:17px;display:grid;place-items:center}.nav-icon :global(svg){width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.navigation-spacer{flex:1}
  .main-view{min-width:0;height:100vh;display:flex;flex-direction:column;overflow:hidden}.page-toolbar{min-height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;border-bottom:1px solid var(--border-soft);background:var(--bg)}.page-toolbar h1{margin:0;font-size:16px;font-weight:680;letter-spacing:-.015em}.toolbar-actions{display:flex;align-items:center;gap:6px}.fixture-badge{padding:3px 6px;border:1px solid var(--border);border-radius:5px;color:var(--muted-2);font-size:8px}.page-content{flex:1;min-height:0;overflow:auto;padding:24px 28px 44px}.settings-content{max-width:980px}
  .more-menu{position:relative}.more-menu summary{width:30px;height:30px;display:grid;place-items:center;list-style:none;border-radius:6px;color:var(--muted);cursor:pointer}.more-menu summary:hover,.more-menu[open] summary{background:var(--surface-2);color:var(--text)}.more-menu summary::-webkit-details-marker{display:none}.menu-popover{position:absolute;z-index:20;right:0;top:34px;width:168px;display:grid;padding:5px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);box-shadow:var(--shadow-popover)}.menu-popover button{width:100%;padding:7px 8px;border-radius:5px;background:transparent;color:var(--text-soft);text-align:left;cursor:pointer;font-size:10px}.menu-popover button:hover:not(:disabled){background:var(--surface-3)}
  .primary-button,.secondary-button,.icon-button{min-height:32px;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer}.primary-button,.secondary-button{padding:6px 11px}.primary-button{border:1px solid var(--accent);background:var(--accent);color:var(--accent-ink)}.primary-button:hover:not(:disabled){background:var(--accent-hover)}.secondary-button{border:1px solid var(--border);background:var(--surface-2);color:var(--text-soft)}.secondary-button:hover:not(:disabled){background:var(--surface-3);color:var(--text)}.icon-button{width:32px;border:1px solid transparent;background:transparent;color:var(--muted)}.icon-button:hover:not(:disabled){background:var(--surface-2);color:var(--text)}.small-button{min-height:28px;padding:4px 9px;font-size:9px}
  .content-section{margin-bottom:34px}.section-heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:10px}.section-heading h2{margin:0;font-size:12px;font-weight:700}.section-heading p{margin:2px 0 0;color:var(--muted-2);font-size:9px}.resource-list{border:1px solid var(--border-soft);border-radius:8px;overflow:hidden;background:var(--bg-elevated)}.resource-row{min-height:74px;display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:center;gap:12px;padding:12px 12px 12px 14px}.app-icon{width:36px;height:36px;display:grid;place-items:center;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text-soft)}.app-icon :global(svg){width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.resource-main{min-width:0}.resource-title{font-size:11px;font-weight:700}.resource-meta{display:flex;align-items:center;gap:5px;margin-top:3px;color:var(--muted);font-size:9px}.meta-separator{color:var(--muted-2)}.status-good{color:#9ee8b9!important}.status-warning{color:#f6d97c!important}.resource-actions{display:flex;align-items:center;gap:5px}
  .definition-rows{border-top:1px solid var(--border-soft)}.definition-row{min-height:42px;display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid var(--border-soft)}.definition-row>span{color:var(--muted);font-size:10px}.definition-row>strong,.definition-row code{font-size:10px;font-weight:650;color:var(--text-soft)}.definition-row code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.inline-action{display:flex;align-items:center;gap:10px}
  .inline-guidance{margin-top:10px;padding:14px 14px 13px;border:1px solid #5b4a22;border-radius:8px;background:var(--warning-bg)}.inline-guidance>div{display:grid;gap:2px}.inline-guidance strong{font-size:10px}.inline-guidance span{color:var(--muted);font-size:9px}.inline-guidance ol{margin:11px 0 12px;padding-left:18px;color:var(--text-soft);font-size:9px;line-height:1.75}.inline-note{display:flex;gap:8px;margin-top:10px;padding:9px 0;color:var(--muted);font-size:9px}.inline-note strong{color:var(--text-soft);font-size:9px}.inline-alert{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:10px;padding:10px 12px;border:1px solid #5b4a22;border-radius:7px;background:var(--warning-bg)}.inline-alert>div{display:grid;gap:2px}.inline-alert strong{font-size:9px}.inline-alert span{color:var(--muted);font-size:9px}.danger-alert{display:grid;gap:2px;border-color:#693437;background:var(--danger-bg)}
  .setup-panel{max-width:760px;padding-top:10px}.setup-copy h2{margin:0;font-size:20px;letter-spacing:-.02em}.setup-copy p{margin:6px 0 0;color:var(--muted);font-size:10px}.setup-steps{margin-top:24px;border-top:1px solid var(--border-soft)}.setup-step{display:grid;grid-template-columns:26px minmax(0,1fr);gap:11px;padding:14px 0;border-bottom:1px solid var(--border-soft)}.step-number{width:23px;height:23px;display:grid;place-items:center;border-radius:50%;background:var(--surface-2);color:var(--muted);font-size:9px;font-weight:700}.setup-step.active .step-number{background:rgba(99,168,255,.12);color:var(--info)}.setup-step>div{display:grid;gap:2px}.setup-step strong{font-size:10px}.setup-step span{color:var(--muted);font-size:9px}.setup-footer{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:18px}.setup-warning{max-width:520px;color:var(--warning);font-size:9px}
  .message-state{max-width:760px;display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:start;gap:12px;padding-top:12px}.message-icon{width:26px;height:26px;display:grid;place-items:center;border-radius:6px;background:var(--surface-2);font-size:11px;font-weight:800}.message-icon.danger{background:var(--danger-bg);color:var(--danger)}.message-copy h2{margin:0;font-size:16px}.message-copy p{margin:5px 0 0;color:var(--muted);font-size:10px}
  .task-strip{display:flex;align-items:center;gap:8px;margin-bottom:16px;padding:8px 10px;border:1px solid var(--border-soft);border-radius:7px;background:var(--bg-elevated);font-size:9px}.task-spinner{width:9px;height:9px;border:2px solid var(--surface-4);border-top-color:var(--info);border-radius:50%;animation:spin .8s linear infinite}.task-strip small{margin-left:auto;color:var(--muted-2);font-size:8px}
  .support-banner{display:flex;align-items:flex-start;gap:9px;margin-bottom:24px;padding:10px 0 18px;border-bottom:1px solid var(--border-soft)}.support-banner-dot{width:7px;height:7px;margin-top:4px;border-radius:50%;background:var(--warning)}.support-banner>div{display:grid;gap:2px}.support-banner strong{font-size:10px}.support-banner span{color:var(--muted);font-size:9px}.settings-section{max-width:780px;margin-bottom:30px}.settings-section h2{margin:0 0 9px;font-size:12px}.settings-row{min-height:54px;display:flex;align-items:center;justify-content:space-between;gap:24px;border-top:1px solid var(--border-soft)}.settings-row.compact{min-height:42px}.settings-row>div{display:grid;gap:2px}.settings-row strong{font-size:10px}.settings-row span{color:var(--muted);font-size:9px;line-height:1.4}
  .advanced-recovery,.recent-activity{margin-top:8px;border-top:1px solid var(--border-soft)}.advanced-recovery summary,.recent-activity summary{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:12px 0;list-style:none;cursor:pointer}.advanced-recovery summary::-webkit-details-marker,.recent-activity summary::-webkit-details-marker{display:none}.advanced-recovery summary>span:first-child,.recent-activity summary>span:first-child{display:grid;gap:2px}.advanced-recovery summary strong,.recent-activity summary strong{font-size:10px}.advanced-recovery summary small,.recent-activity summary small{color:var(--muted);font-size:8px}.advanced-recovery summary>span:last-child,.recent-activity summary>span:last-child{color:var(--muted);font-size:9px}.recovery-list,.recent-list{border-top:1px solid var(--border-soft)}.recovery-list>div,.recent-list>div{min-height:48px;display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid var(--border-soft)}.recovery-list>div>span{display:grid;gap:2px}.recovery-list strong{font-size:9px}.recovery-list small{color:var(--muted);font-size:8px}.recent-list span{font-size:9px}.recent-list strong{font-size:8px;color:#9ee8b9}.recent-list strong.failed{color:#ff9aa2}
  .operation-attention{position:fixed;z-index:220;right:16px;bottom:16px;width:min(360px,calc(100vw - 32px));display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:start;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);box-shadow:var(--shadow-popover)}.operation-attention.success{border-color:var(--accent-border)}.operation-attention.error{border-color:#705c26}.attention-icon{width:23px;height:23px;display:grid;place-items:center;border-radius:6px;background:var(--surface-3);font-size:9px;font-weight:800}.success .attention-icon{background:var(--accent-soft);color:#9ee8b9}.error .attention-icon{background:var(--warning-bg);color:#fde68a}.attention-copy{display:grid;gap:2px}.attention-copy strong{font-size:9px}.attention-copy span{color:var(--muted);font-size:8px;line-height:1.4}.attention-actions{display:flex;gap:4px}.attention-actions button{min-height:24px;padding:4px 6px;border:1px solid var(--border);border-radius:5px;background:var(--surface-3);font-size:8px;font-weight:700}.attention-actions .dismiss{width:24px;padding:0;border:0;background:transparent;color:var(--muted);font-size:15px}
  @keyframes spin{to{transform:rotate(360deg)}}
  @media(max-width:760px){.desktop-shell{grid-template-columns:62px minmax(0,1fr)}.navigation{padding-inline:7px}.navigation-brand strong,.global-nav button>span:not(.nav-icon),.support-nav>span:not(.nav-icon){display:none}.navigation-brand{justify-content:center;padding-inline:0}.global-nav button,.support-nav{justify-content:center;padding:0}.page-toolbar{padding:0 16px}.page-content{padding:20px 16px 36px}.resource-row{grid-template-columns:36px minmax(0,1fr)}.resource-actions{grid-column:1/-1;justify-content:flex-end;padding-top:2px}.setup-footer,.settings-row,.recovery-list>div{align-items:flex-start;flex-direction:column}.operation-attention{right:10px;bottom:10px;width:calc(100vw - 20px);grid-template-columns:auto minmax(0,1fr)}.attention-actions{grid-column:2}}
</style>
