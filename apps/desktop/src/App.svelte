<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { onDestroy, onMount, tick } from 'svelte';
  import ProjectNavigator from './ProjectNavigator.svelte';
  import { version as desktopVersion } from '../package.json';
  import { connectionChanged } from './connectionWatch';
  import { observeStatus } from './statusObservation';
  import type { ProjectAction } from './projectNavigationTypes';
  import type {
    SystemStatus, ConnectionStatus, PluginFileActionResult, BootstrapActionResult,
    ManagedActionResult, ManagedUpdateCheck, BlockbenchFocusResult, EnsureReadyResult,
    DesktopCommandError, DiagnosticExportResult, ProjectNavigationActionResult,
    ProjectPathResult, ManagedProgress,
  } from './desktopTypes';
  import { compatibilityLabel, productMode, productHeadline, productMessage, productGuidance, managedActionPresentation } from './desktopPresentation';

  let status: SystemStatus | null = null;
  let loading = true;
  let error = '';
  let busyAction: 'install' | 'connect-blockbench' | 'update' | 'rollback' | 'recover' | 'repair' | 'setup-tls' | 'show-plugin' | 'export-diagnostics' | 'project-action' | null = null;
  let pluginApprovalNeeded = false;
  let readinessReason = '';
  let actionMessage = '';
  let actionMessageKind: 'success' | 'pending' | 'unchanged' = 'success';
  let progressStage = '';
  let stopProgressListener: (() => void) | null = null;
  let successToastTimer: number | null = null;
  let utilityMenuOpen = false;
  let statusWatcherTimer: number | null = null;
  let statusProbeInFlight = false;
  let statusProbeFailures = 0;
  let updateCheck: ManagedUpdateCheck | null = null;
  let updateCheckStarted = false;
  type Page = 'Overview' | 'Support';
  let page: Page = 'Overview';
  // Ephemeral view preferences survive Workspace/Support navigation only.
  let expandedProjectId: string | null = null;
  let showAllProjects = false;
  let projectSearch = '';
  let modelSearch = '';
  let workspaceScrollTop = 0;
  let workspaceMain: HTMLElement | undefined;

  const progressLabel = (stage: string) => stage.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

  type OperationRecord = {
    action: string;
    outcome: 'success' | 'pending' | 'unchanged' | 'failed';
    status: string;
    at: string;
  };
  let operations: OperationRecord[] = [];

  function recordOperation(action: string, outcome: 'success' | 'pending' | 'unchanged' | 'failed', status: string) {
    operations = [
      { action, outcome, status, at: new Date().toLocaleTimeString() },
      ...operations,
    ].slice(0, 8);
  }

  function navigate(next: Page) {
    utilityMenuOpen = false;
    if (next === page) return;
    if (page === 'Overview' && workspaceMain) workspaceScrollTop = workspaceMain.scrollTop;
    page = next;
    if (next === 'Overview') {
      void tick().then(() => {
        if (page === 'Overview' && workspaceMain) workspaceMain.scrollTop = workspaceScrollTop;
      });
    }
  }

  function closeUtilityMenu() {
    utilityMenuOpen = false;
  }

  function closeActionDisclosures(restoreFocus = false) {
    const openDisclosures = Array.from(document.querySelectorAll<HTMLDetailsElement>('details.more-menu[open]'));
    const active = document.activeElement;
    const focusedDisclosure = openDisclosures.find(menu => menu.contains(active));
    for (const menu of openDisclosures) menu.open = false;
    utilityMenuOpen = false;
    if (restoreFocus) focusedDisclosure?.querySelector<HTMLElement>('summary')?.focus();
  }

  function clearSuccessToast() {
    if (successToastTimer !== null) window.clearTimeout(successToastTimer);
    successToastTimer = null;
    actionMessage = '';
    actionMessageKind = 'success';
  }

  function showSuccessToast(
    message: string,
    kind: 'success' | 'pending' | 'unchanged' = 'success'
  ) {
    if (successToastTimer !== null) window.clearTimeout(successToastTimer);
    actionMessageKind = kind;
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
      status = await observeStatus(invoke<SystemStatus>('system_status'), 30_000);
      statusProbeFailures = 0;
      if (status && devFixture) status = applyDevFixture(status, devFixture);
    } catch (cause) {
      // A failed full observation must never leave actions enabled using
      // the last successful snapshot. Only full status can clear this gate.
      if (status) statusProbeFailures = 2;
      error = errorMessage(cause);
    } finally {
      loading = false;
    }
  }

  async function runProjectAction(action: ProjectAction, id: string) {
    if (devFixture || busyAction || statusProbeFailures >= 2) return;
    if (action === 'restore-project-preferences' &&
        !window.confirm('Restore the last saved project pins? The damaged settings file will be retained.')) return;
    closeActionDisclosures(true);
    busyAction = 'project-action';
    error = '';
    clearSuccessToast();
    try {
      await invoke<ProjectNavigationActionResult>('project_navigation_action', { action, id });
      if (action === 'pin-project' || action === 'unpin-project' || action === 'restore-project-preferences') await refresh();
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busyAction = null;
    }
  }

  async function focusBlockbenchAfterOpen(): Promise<boolean> {
    // Windows may deny foreground activation. The editor launch is still valid.
    try {
      const result = await invoke<BlockbenchFocusResult>('focus_blockbench_window');
      return result.status === 'FOCUSED';
    } catch {
      return false;
    }
  }

  async function openProjectModel(id: string) {
    if (devFixture || busyAction || statusProbeFailures >= 2 || !status?.manager_available) return;
    busyAction = 'project-action';
    error = '';
    clearSuccessToast();
    try {
      const ready = await invoke<EnsureReadyResult>('ensure_ready');
      pluginApprovalNeeded = ready.manual_plugin_approval_recommended;
      readinessReason = ready.reason;
      if (ready.status === 'NEEDS_ATTENTION' || ready.status === 'APPROVAL_REQUIRED') {
        await refresh();
        error = ready.status === 'APPROVAL_REQUIRED'
          ? 'Approve LazyDesigner in Blockbench once, then open the model again.'
          : 'LazyDesigner needs attention before this model can be opened.';
        return;
      }
      await invoke<ProjectNavigationActionResult>('project_navigation_action', { action: 'open-model', id });
      const focused = await focusBlockbenchAfterOpen();
      await refresh();
      showSuccessToast(focused
        ? 'Model open request sent to Blockbench. Window focus confirmed.'
        : 'Model open request sent. Select Blockbench from the taskbar if needed.');
    } catch (cause) {
      error = errorMessage(cause);
    } finally {
      busyAction = null;
    }
  }

  async function copyNavigationPath(id: string) {
    if (devFixture || busyAction || statusProbeFailures >= 2) return;
    try {
      closeActionDisclosures(true);
      const result = await invoke<ProjectPathResult>('project_navigation_path', { id });
      await navigator.clipboard.writeText(result.path);
      showSuccessToast('Path copied.');
    } catch (cause) {
      error = errorMessage(cause);
    }
  }

  async function watchSystemStatus() {
    if (devFixture || busyAction || document.hidden || !status || statusProbeInFlight || statusProbeFailures >= 2) return;
    statusProbeInFlight = true;
    try {
      const candidate = await observeStatus(invoke<ConnectionStatus>('connection_status'), 10_000);
      // A lightweight probe cannot validate a previously failed full status
      // observation. Keep actions disabled until the user explicitly Refreshes.
      if (statusProbeFailures >= 2) return;
      if (connectionChanged(candidate, status)) await refresh();
      else statusProbeFailures = 0;
    } catch {
      // Failed probes invalidate the live status, but do not trigger repairs.
      statusProbeFailures = Math.min(statusProbeFailures + 1, 2);
    } finally {
      statusProbeInFlight = false;
    }
  }

  async function connectBlockbench() {
    if (devFixture) return;
    if (!status?.manager_available || busyAction || statusProbeFailures >= 2) return;
    closeUtilityMenu();
    busyAction = 'connect-blockbench';
    error = '';
    clearSuccessToast();
    try {
      const result = await invoke<EnsureReadyResult>('ensure_ready');
      pluginApprovalNeeded = result.manual_plugin_approval_recommended;
      readinessReason = result.reason;
      await refresh();
      if (result.status === 'READY' || result.status === 'RUNTIME_READY') {
        const focused = await focusBlockbenchAfterOpen();
        const connection = result.status === 'READY' ? 'AI connection is ready.' : 'AI client can connect when needed.';
        showSuccessToast(focused
          ? `Blockbench window focus confirmed. ${connection}`
          : `Blockbench is ready. Select it from the taskbar if needed. ${connection}`);
      } else if (result.status === 'NEEDS_ATTENTION' && result.reason !== 'PLUGIN_MISSING_WHILE_BLOCKBENCH_RUNNING') {
        error = result.reason === 'PLUGIN_INTEGRITY'
          ? 'The managed Blockbench plugin was modified and needs review.'
          : result.reason === 'BLOCKBENCH_EXITED'
            ? 'Blockbench closed before LazyDesigner could become ready.'
            : result.reason === 'RUNTIME_ENDPOINT_MISMATCH'
              ? 'Blockbench and the MCP client are using different local connection settings. Restore matching connection settings or open Support.'
              : result.reason === 'RUNTIME_START_FAILED'
                ? 'LazyDesigner loaded in Blockbench, but its local Runtime could not start. Open Support.'
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
    if (!status?.bootstrap_available || status.manager_available || busyAction || statusProbeFailures >= 2) return;
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
          : ready.reason === 'RUNTIME_ENDPOINT_MISMATCH'
            ? 'Setup completed, but Blockbench and the MCP client use different local connection settings.'
            : ready.reason === 'RUNTIME_START_FAILED'
              ? 'Setup completed, but the local Runtime could not start in Blockbench.'
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
      showSuccessToast(pluginApprovalNeeded && productMode(status) === 'plugin-setup'
        ? 'Plugin file highlighted. Approve it in Blockbench if prompted.'
        : 'Plugin file highlighted in File Explorer.');
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

  async function checkManagedUpdateOnce() {
    if (devFixture || updateCheckStarted || !status?.manager_available) return;
    updateCheckStarted = true;
    try {
      updateCheck = await invoke<ManagedUpdateCheck>('check_managed_update');
    } catch {
      // Advisory only: offline/restricted networks never block local use.
      updateCheck = null;
    }
  }

  async function runManagedAction(action: 'update' | 'rollback' | 'recover' | 'repair' | 'setup-tls') {
    if (devFixture) return;
    if (!status?.manager_available || busyAction || statusProbeFailures >= 2) return;
    // A pending file is not an installable update until the canonical manager
    // has verified its staged package and installation-root provenance.
    if (action === 'update' && status.managed?.pending &&
        updateCheck?.status !== 'UPDATE_STAGED') return;
    closeUtilityMenu();
    busyAction = action;
    progressStage = 'preflight';
    error = '';
    clearSuccessToast();
    try {
      const result = await invoke<ManagedActionResult>('managed_action', { action });
      const feedback = managedActionPresentation(action, result.receipt);
      const actionLabel = action === 'update' ? 'Update managed components' : action === 'rollback' ? 'Restore previous version' : action === 'repair' ? 'Repair LazyDesigner' : action === 'setup-tls' ? 'Finish secure setup' : 'Finish incomplete setup';
      showSuccessToast(feedback.message, feedback.kind);
      recordOperation(actionLabel, feedback.kind, feedback.status);
      await refresh();
      if (action === 'update') updateCheck = null;
    } catch (cause) {
      const actionLabel = action === 'update' ? 'Update managed components' : action === 'rollback' ? 'Restore previous version' : action === 'repair' ? 'Repair LazyDesigner' : action === 'setup-tls' ? 'Finish secure setup' : 'Finish incomplete setup';
      recordOperation(actionLabel, 'failed', errorCode(cause));
      error = errorMessage(cause);
    } finally {
      busyAction = null;
      progressStage = '';
    }
  }

  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && document.querySelector('details.more-menu[open]')) {
        event.preventDefault();
        closeActionDisclosures(true);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      for (const menu of document.querySelectorAll<HTMLDetailsElement>('details.more-menu[open]')) {
        if (!menu.contains(target)) menu.open = false;
      }
      if (!target.closest('details.more-menu')) utilityMenuOpen = false;
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
    void refresh().then(() => {
      void checkManagedUpdateOnce();
      void watchSystemStatus();
    });
    statusWatcherTimer = window.setInterval(() => { void watchSystemStatus(); }, 3000);
    let progressListenerDisposed = false;
    void listen<ManagedProgress>('managed-progress', event => {
      if (!progressListenerDisposed && busyAction && event.payload.action === busyAction) {
        progressStage = event.payload.stage;
      }
    }).then(unlisten => {
      // Listener registration is asynchronous. If unmounted while awaiting,
      // immediately release the late registration instead of leaking it.
      if (progressListenerDisposed) unlisten();
      else stopProgressListener = unlisten;
    }).catch(() => {
      // Progress messages are optional; maintenance result and refresh own truth.
    });
    return () => {
      progressListenerDisposed = true;
      stopProgressListener?.();
      stopProgressListener = null;
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
      runtime_url: next.managed?.runtime_url ?? 'https://127.0.0.1:3000/bb-mcp',
      tls_ready: true,
      tls_error: null,
      rollback: { available: false, previous_source_sha: null, transaction: null },
    };

    next.runtime_listener_live = runtimeOnline;
    next.runtime_endpoint_match = runtimeOnline ? true : null;
    next.runtime_ready = runtimeOnline;

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

    next.project_navigation = {
      revision: 'fixture:1',
      session_live: fixture !== 'fresh-install' && fixture !== 'runtime-offline',
      continue_model_id: fixture === 'fresh-install' ? null : 'model-fixture',
      preferences_issue: null,
      active: fixture === 'fresh-install' ? null : {
        project_id: 'project-fixture',
        project_name: 'Furniture',
        model_id: 'model-fixture',
        model_name: 'Modern Chair',
        saved: true,
        dirty: false,
      },
      projects: fixture === 'fresh-install' ? [] : [{
        id: 'project-fixture',
        name: 'Furniture',
        active: true,
        pinned: true,
        model_count: 2,
        models: [
          { id: 'model-fixture', name: 'Modern Chair', active: true, open: true, dirty: false, exists: true },
          { id: 'model-fixture-2', name: 'Sofa', active: false, open: true, dirty: true, exists: true },
        ],
        folders: [
          { id: 'folder-fixture-models', label: 'Models', kind: 'models' },
          { id: 'folder-fixture-references', label: 'References', kind: 'references' },
        ],
      }],
    };

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
          <span class="nav-icon">{@render navIcon('Overview')}</span><span>Workspace</span>
        </button>
        <button class:active={page === 'Support'} aria-current={page === 'Support' ? 'page' : undefined} onclick={() => navigate('Support')}>
          <span class="nav-icon">{@render navIcon('Support')}</span><span>Support</span>
        </button>
      </nav>
    </aside>

    <section id="main-content" class="main-view" tabindex="-1">
      <header class="page-toolbar">
        <h1>{page === 'Overview' ? 'Workspace' : 'Support'}</h1>
        <div class="toolbar-actions">
          {#if devFixture}<span class="fixture-badge">Fixture · {devFixture}</span>{/if}
          {#if statusProbeFailures >= 2}<span class="status-probe-warning" role="status">Status unverified · Refresh to retry</span>{/if}
          {#if page === 'Overview'}
            <details class="more-menu" bind:open={utilityMenuOpen}>
              <summary aria-label="More actions">•••</summary>
              <div class="menu-popover">
                <button disabled={loading || busyAction !== null} onclick={refresh}>Refresh</button>
                {#if status?.manager_available}<button disabled={busyAction !== null} onclick={showPluginFile}>Show plugin file</button>{/if}
                <button disabled={busyAction !== null} onclick={exportDiagnostics}>Export diagnostics</button>
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
        <main class="page-content workspace-overview" bind:this={workspaceMain}>
          {#if busyAction && progressStage}
            <section class="task-strip" aria-live="polite">
              <span class="task-spinner"></span>
              <span>{busyAction === 'update' ? 'Updating managed components' : busyAction === 'rollback' ? 'Restoring previous version' : busyAction === 'repair' ? 'Repairing LazyDesigner' : busyAction === 'recover' ? 'Finishing setup' : busyAction === 'setup-tls' ? 'Finishing setup' : busyAction === 'connect-blockbench' ? 'Connecting to Blockbench' : 'Working'}</span>
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
                {#if productGuidance(status, pluginApprovalNeeded)}<span class="setup-warning">{productGuidance(status, pluginApprovalNeeded)}</span>{:else}<span></span>{/if}
                <button class="primary-button" onclick={installLazyDesigner} disabled={!status.bootstrap_available || busyAction !== null || statusProbeFailures >= 2}>{busyAction === 'install' ? 'Setting up…' : 'Set up'}</button>
              </div>
            </section>

          {:else}
            {#if (productMode(status) === 'ready' || productMode(status) === 'client-wait') && (status.project_navigation.active || status.project_navigation.projects.length > 0)}
              <section class="workspace-connection" aria-label="Connection status">
                <span class="connection-dot" class:waiting={productMode(status) === 'client-wait'} class:unknown={statusProbeFailures >= 2} aria-hidden="true"></span>
                <div class="connection-copy">
                  <strong>{statusProbeFailures >= 2 ? 'Connection status unverified' : productMode(status) === 'ready' ? 'AI connected' : 'Blockbench ready'}</strong>
                  <span>{statusProbeFailures >= 2 ? 'Refresh to verify the connection before continuing.' : productMode(status) === 'ready' ? 'Blockbench and LazyDesigner are ready.' : 'Editing is available. Connect the AI client when needed.'}</span>
                </div>
                {#if statusProbeFailures >= 2}
                  <button class="secondary-button small-button" onclick={refresh} disabled={loading || busyAction !== null}>Refresh</button>
                {:else}
                  <button class="quiet-link" onclick={() => navigate('Support')}>Connection details</button>
                {/if}
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
                        {statusProbeFailures >= 2 ? 'Status unverified' : productMode(status) === 'ready' ? 'Connected' : productMode(status) === 'client-wait' ? 'Ready' : status.blockbench.running ? 'Running' : 'Not running'}
                      </span>
                    </div>
                  </div>

                  <div class="resource-actions">
                    {#if productMode(status) === 'ready'}
                      <button class="secondary-button" onclick={connectBlockbench} disabled={!status.manager_available || busyAction !== null || statusProbeFailures >= 2}>Open</button>
                    {:else if productMode(status) === 'ready-start'}
                      <button class="primary-button" onclick={connectBlockbench} disabled={!status.manager_available || busyAction !== null || statusProbeFailures >= 2}>{busyAction === 'connect-blockbench' ? 'Preparing…' : 'Open'}</button>
                    {:else if productMode(status) === 'plugin-setup'}
                      <button class="secondary-button" onclick={connectBlockbench} disabled={!status.manager_available || busyAction !== null || statusProbeFailures >= 2}>Open</button>
                    {:else if productMode(status) === 'unsupported'}
                      <button class="secondary-button" onclick={refresh} disabled={loading || busyAction !== null}>Check again</button>
                    {:else}
                      <button class="secondary-button" onclick={connectBlockbench} disabled={!status.manager_available || busyAction !== null || statusProbeFailures >= 2}>Open</button>
                    {/if}
                    <button class="secondary-button small-button" title="Show Blockbench plugin file" onclick={showPluginFile} disabled={!status.manager_available || busyAction !== null || statusProbeFailures >= 2}>Plugin file</button>
                  </div>
                </div>
              </div>

              {#if productMode(status) === 'plugin-setup'}
                <div class="inline-guidance">
                  {#if status.runtime_endpoint_match === false}
                    <div>
                      <strong>Local connection settings do not match</strong>
                      <span>Blockbench and the MCP client must use the same LazyDesigner connection settings.</span>
                    </div>
                    <button class="secondary-button" onclick={() => navigate('Support')}>Open Support</button>
                  {:else if !pluginApprovalNeeded}
                    <div>
                      <strong>LazyDesigner is not active yet</strong>
                      <span>Desktop can open Blockbench and verify the Runtime automatically.</span>
                    </div>
                    <button class="primary-button" onclick={connectBlockbench} disabled={!status.manager_available || busyAction !== null || statusProbeFailures >= 2}>{busyAction === 'connect-blockbench' ? 'Preparing…' : 'Prepare Blockbench'}</button>
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
            {/if}

            <ProjectNavigator
              navigation={status.project_navigation}
              bind:expandedProjectId
              bind:showAllProjects
              bind:projectSearch
              bind:modelSearch
              busy={busyAction !== null || statusProbeFailures >= 2}
              onOpenModel={openProjectModel}
              onProjectAction={runProjectAction}
              onCopyPath={copyNavigationPath}
            />

            {#if productMode(status) !== 'ready' && productMode(status) !== 'client-wait' || status.managed?.pending || updateCheck?.status === 'UPDATE_AVAILABLE' || updateCheck?.status === 'UPDATE_STAGED'}
            <section class="content-section">
              <div class="section-heading">
                <div><h2>Managed components</h2><p>Connection and update status</p></div>
              </div>

              <div class="definition-rows">
                <div class="definition-row">
                  <span>Status</span>
                  <strong class:status-good={productMode(status) === 'ready' || productMode(status) === 'client-wait'} class:status-warning={productMode(status) !== 'ready' && productMode(status) !== 'client-wait'}>
                    {statusProbeFailures >= 2 ? 'Status unverified' : productMode(status) === 'ready' ? 'Ready' : productMode(status) === 'client-wait' ? 'Waiting for MCP client' : productHeadline(status)}
                  </strong>
                </div>
                {#if status.managed?.pending || updateCheck?.status === 'UPDATE_AVAILABLE' || updateCheck?.status === 'UPDATE_STAGED' || updateCheck?.status === 'UPDATE_STAGED_UNVERIFIED'}
                  <div class="definition-row update-definition">
                    <span>Update</span>
                    <div class="inline-action">
                      <strong>{status.managed?.pending
                        ? updateCheck?.status === 'UPDATE_STAGED'
                          ? 'Package staged · not active'
                          : updateCheck?.status === 'UPDATE_STAGED_UNVERIFIED'
                            ? 'Staged package unverified'
                            : 'Checking staged package'
                        : updateCheck?.status === 'UPDATE_AVAILABLE'
                          ? 'Update available · not downloaded'
                          : 'Update not activated'}</strong>
                      {#if updateCheck?.status === 'UPDATE_STAGED_UNVERIFIED'}
                        <button class="secondary-button small-button" onclick={() => navigate('Support')}>Support</button>
                      {:else}
                        <button class="secondary-button small-button" onclick={() => runManagedAction('update')} disabled={!status.maintenance.update || busyAction !== null || statusProbeFailures >= 2 || (status.managed?.pending === true && updateCheck?.status !== 'UPDATE_STAGED')}>{busyAction === 'update' ? 'Updating…' : status.managed?.pending ? 'Finish update' : 'Update components'}</button>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>

              {#if productMode(status) === 'security-setup'}
                <div class="inline-alert"><div><strong>Finish setup</strong><span>Complete the secure local connection before using LazyDesigner.</span></div><button class="primary-button small-button" onclick={() => runManagedAction('setup-tls')} disabled={!status.maintenance.setup_tls || busyAction !== null || statusProbeFailures >= 2}>Finish setup</button></div>
              {:else if productMode(status) === 'client-wait'}
                <div class="inline-note"><strong>Blockbench Runtime is ready.</strong><span>The MCP client owns the Gateway connection and can attach when needed.</span></div>
              {:else if productMode(status) === 'attention'}
                <div class="inline-alert"><div><strong>Action required</strong><span>{productGuidance(status, pluginApprovalNeeded) ?? status.readiness.summary}</span></div><button class="secondary-button small-button" onclick={() => navigate('Support')}>Open Support</button></div>
              {/if}
            </section>
            {/if}
          {/if}
        </main>

      {:else}
        <main class="page-content settings-content">
          {#if statusProbeFailures >= 2}
            <section class="support-banner" role="status">
              <span class="support-banner-dot" aria-hidden="true"></span>
              <div><strong>Connection status unverified</strong><span>These are the last known details. Refresh to verify the system before making changes.</span></div>
              <button class="secondary-button small-button" onclick={refresh} disabled={loading || busyAction !== null}>Refresh</button>
            </section>
          {:else if productMode(status) !== 'ready'}
            <div class="support-banner">
              <span class="support-banner-dot"></span>
              <div><strong>{productHeadline(status)}</strong><span>{productMessage(status)}</span></div>
            </div>
          {/if}

          <section class="settings-section">
            <h2>About</h2>
            <div class="definition-rows">
              <div class="definition-row"><span>LazyDesigner Desktop version</span><strong>{desktopVersion}</strong></div>
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
                  <div><span><strong>Restore previous version</strong><small>{status.maintenance.rollback ? 'Return to the last verified version.' : 'No previous version is available.'}</small></span><button class="secondary-button small-button" onclick={() => runManagedAction('rollback')} disabled={!status.maintenance.rollback || busyAction !== null || statusProbeFailures >= 2}>Restore</button></div>
                  <div><span><strong>Repair LazyDesigner</strong><small>{status.maintenance.repair ? 'Restore missing files from the current installation.' : 'Repair is not available right now.'}</small></span><button class="secondary-button small-button" onclick={() => runManagedAction('repair')} disabled={!status.maintenance.repair || busyAction !== null || statusProbeFailures >= 2}>Repair</button></div>
                  <div><span><strong>Finish incomplete setup</strong><small>{status.maintenance.recover ? 'Recover an interrupted installation.' : 'No interrupted setup was found.'}</small></span><button class="secondary-button small-button" onclick={() => runManagedAction('recover')} disabled={!status.maintenance.recover || busyAction !== null || statusProbeFailures >= 2}>Recover</button></div>
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
                    <div><span>{operation.action}</span><strong class:failed={operation.outcome === 'failed'} class:pending={operation.outcome === 'pending'} class:unchanged={operation.outcome === 'unchanged'}>{operation.outcome === 'success' ? 'Completed' : operation.outcome === 'pending' ? 'Next step' : operation.outcome === 'unchanged' ? 'No change' : 'Failed'}</strong></div>
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
  <aside class:error={Boolean(error)} class:success={Boolean(actionMessage) && !error && actionMessageKind === 'success'} class:notice={Boolean(actionMessage) && !error && actionMessageKind !== 'success'} class="operation-attention" aria-live={error ? 'assertive' : 'polite'}>
    <div class="attention-icon">{error ? '!' : actionMessage ? (actionMessageKind === 'success' ? '✓' : 'i') : '•'}</div>
    <div class="attention-copy"><strong>{error ? 'Something needs attention' : actionMessage ? (actionMessageKind === 'pending' ? 'Next step' : actionMessageKind === 'unchanged' ? 'No change' : 'Done') : 'Working'}</strong><span>{error || actionMessage || progressLabel(progressStage)}</span></div>
    <div class="attention-actions">
      {#if error}<button onclick={() => navigate('Support')}>Support</button>{/if}
      {#if error || actionMessage}<button class="dismiss" aria-label="Dismiss notification" onclick={() => { error=''; clearSuccessToast(); }}>×</button>{/if}
    </div>
  </aside>
{/if}

<style>
  .loading-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;gap:10px;background:var(--bg);color:var(--muted);font-size:var(--font-ui)}.loading-spinner{width:12px;height:12px;border:2px solid var(--surface-4);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}
  .skip-link{position:fixed;z-index:1000;top:8px;left:8px;transform:translateY(-150%);padding:8px 10px;border:1px solid var(--accent);border-radius:7px;background:var(--surface);color:var(--text);font-weight:700;text-decoration:none}.skip-link:focus{transform:translateY(0)}
  .desktop-shell{display:grid;grid-template-columns:168px minmax(0,1fr);width:100%;height:100vh;background:var(--bg)}
  .navigation{display:flex;flex-direction:column;padding:12px 9px;border-right:1px solid var(--border-soft);background:#0f1113}.navigation-brand{display:flex;align-items:center;gap:9px;padding:7px 8px 18px}.navigation-brand strong{font-size:var(--font-title);font-weight:700;letter-spacing:-.01em}.brand-mark{width:10px;height:10px;border-radius:3px;background:var(--accent)}.global-nav{display:grid;gap:2px}.global-nav button,.support-nav{min-height:36px;display:flex;align-items:center;gap:9px;padding:0 9px;border-radius:7px;background:transparent;color:var(--muted);font-size:var(--font-ui);font-weight:600;text-align:left;cursor:pointer}.global-nav button:hover,.support-nav:hover{background:var(--surface);color:var(--text-soft)}.global-nav button.active,.support-nav.active{background:var(--surface);color:var(--text)}.nav-icon{width:17px;height:17px;display:grid;place-items:center}.nav-icon :global(svg){width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}.navigation-spacer{flex:1}
  .main-view{min-width:0;height:100vh;display:flex;flex-direction:column;overflow:hidden}.page-toolbar{min-height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;border-bottom:1px solid var(--border-soft);background:var(--bg)}.page-toolbar h1{margin:0;font-size:16px;font-weight:680;letter-spacing:-.015em}.toolbar-actions{display:flex;align-items:center;gap:6px}.fixture-badge{padding:3px 6px;border:1px solid var(--border);border-radius:5px;color:var(--muted-2);font-size:var(--font-xs)}.page-content{flex:1;min-height:0;overflow:auto;padding:24px 28px 44px}.settings-content{max-width:980px}
  .status-probe-warning{font-size:var(--font-sm);color:var(--warning)}
  .more-menu{position:relative}.more-menu summary{width:30px;height:30px;display:grid;place-items:center;list-style:none;border-radius:6px;color:var(--muted);cursor:pointer}.more-menu summary:hover,.more-menu[open] summary{background:var(--surface-2);color:var(--text)}.more-menu summary::-webkit-details-marker{display:none}.menu-popover{position:absolute;z-index:20;right:0;top:34px;width:168px;display:grid;padding:5px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);box-shadow:var(--shadow-popover)}.menu-popover button{width:100%;padding:7px 8px;border-radius:5px;background:transparent;color:var(--text-soft);text-align:left;cursor:pointer;font-size:var(--font-sm)}.menu-popover button:hover:not(:disabled){background:var(--surface-3)}
  .primary-button,.secondary-button,.icon-button{min-height:32px;border-radius:6px;font-size:var(--font-sm);font-weight:700;cursor:pointer}.primary-button,.secondary-button{padding:6px 11px}.primary-button{border:1px solid var(--accent);background:var(--accent);color:var(--accent-ink)}.primary-button:hover:not(:disabled){background:var(--accent-hover)}.secondary-button{border:1px solid var(--border);background:var(--surface-2);color:var(--text-soft)}.secondary-button:hover:not(:disabled){background:var(--surface-3);color:var(--text)}.icon-button{width:32px;border:1px solid transparent;background:transparent;color:var(--muted)}.icon-button:hover:not(:disabled){background:var(--surface-2);color:var(--text)}.small-button{min-height:32px;padding:4px 9px;font-size:var(--font-sm)}
  .content-section{margin-bottom:34px}.section-heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:10px}.section-heading h2{margin:0;font-size:var(--font-title);font-weight:700}.section-heading p{margin:2px 0 0;color:var(--muted-2);font-size:var(--font-sm)}.resource-list{border:1px solid var(--border-soft);border-radius:8px;overflow:hidden;background:var(--bg-elevated)}.resource-row{min-height:74px;display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:center;gap:12px;padding:12px 12px 12px 14px}.app-icon{width:36px;height:36px;display:grid;place-items:center;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text-soft)}.app-icon :global(svg){width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.resource-main{min-width:0}.resource-title{font-size:var(--font-ui);font-weight:700}.resource-meta{display:flex;align-items:center;gap:5px;margin-top:3px;color:var(--muted);font-size:var(--font-sm)}.meta-separator{color:var(--muted-2)}.status-good{color:#9ee8b9!important}.status-warning{color:#f6d97c!important}.resource-actions{display:flex;align-items:center;gap:5px}
  .definition-rows{border-top:1px solid var(--border-soft)}.definition-row{min-height:42px;display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid var(--border-soft)}.definition-row>span{color:var(--muted);font-size:var(--font-sm)}.definition-row>strong,.definition-row code{font-size:var(--font-sm);font-weight:650;color:var(--text-soft)}.definition-row code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.inline-action{display:flex;align-items:center;gap:10px}
  .inline-guidance{margin-top:10px;padding:14px 14px 13px;border:1px solid #5b4a22;border-radius:8px;background:var(--warning-bg)}.inline-guidance>div{display:grid;gap:2px}.inline-guidance strong{font-size:var(--font-sm)}.inline-guidance span{color:var(--muted);font-size:var(--font-sm)}.inline-guidance ol{margin:11px 0 12px;padding-left:18px;color:var(--text-soft);font-size:var(--font-sm);line-height:1.75}.inline-note{display:flex;gap:8px;margin-top:10px;padding:9px 0;color:var(--muted);font-size:var(--font-sm)}.inline-note strong{color:var(--text-soft);font-size:var(--font-sm)}.inline-alert{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:10px;padding:10px 12px;border:1px solid #5b4a22;border-radius:7px;background:var(--warning-bg)}.inline-alert>div{display:grid;gap:2px}.inline-alert strong{font-size:var(--font-sm)}.inline-alert span{color:var(--muted);font-size:var(--font-sm)}.danger-alert{display:grid;gap:2px;border-color:#693437;background:var(--danger-bg)}
  .setup-panel{max-width:760px;padding-top:10px}.setup-copy h2{margin:0;font-size:20px;letter-spacing:-.02em}.setup-copy p{margin:6px 0 0;color:var(--muted);font-size:var(--font-sm)}.setup-steps{margin-top:24px;border-top:1px solid var(--border-soft)}.setup-step{display:grid;grid-template-columns:26px minmax(0,1fr);gap:11px;padding:14px 0;border-bottom:1px solid var(--border-soft)}.step-number{width:23px;height:23px;display:grid;place-items:center;border-radius:50%;background:var(--surface-2);color:var(--muted);font-size:var(--font-sm);font-weight:700}.setup-step.active .step-number{background:rgba(99,168,255,.12);color:var(--info)}.setup-step>div{display:grid;gap:2px}.setup-step strong{font-size:var(--font-sm)}.setup-step span{color:var(--muted);font-size:var(--font-sm)}.setup-footer{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:18px}.setup-warning{max-width:520px;color:var(--warning);font-size:var(--font-sm)}
  .message-state{max-width:760px;display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:start;gap:12px;padding-top:12px}.message-icon{width:26px;height:26px;display:grid;place-items:center;border-radius:6px;background:var(--surface-2);font-size:var(--font-ui);font-weight:800}.message-icon.danger{background:var(--danger-bg);color:var(--danger)}.message-copy h2{margin:0;font-size:16px}.message-copy p{margin:5px 0 0;color:var(--muted);font-size:var(--font-sm)}
  .task-strip{display:flex;align-items:center;gap:8px;margin-bottom:16px;padding:8px 10px;border:1px solid var(--border-soft);border-radius:7px;background:var(--bg-elevated);font-size:var(--font-sm)}.task-spinner{width:9px;height:9px;border:2px solid var(--surface-4);border-top-color:var(--info);border-radius:50%;animation:spin .8s linear infinite}.task-strip small{margin-left:auto;color:var(--muted-2);font-size:var(--font-xs)}
  .support-banner{display:flex;align-items:flex-start;gap:9px;margin-bottom:24px;padding:10px 0 18px;border-bottom:1px solid var(--border-soft)}.support-banner-dot{width:7px;height:7px;margin-top:4px;border-radius:50%;background:var(--warning)}.support-banner>div{display:grid;gap:2px}.support-banner strong{font-size:var(--font-sm)}.support-banner span{color:var(--muted);font-size:var(--font-sm)}.settings-section{max-width:780px;margin-bottom:30px}.settings-section h2{margin:0 0 9px;font-size:var(--font-title)}.settings-row{min-height:54px;display:flex;align-items:center;justify-content:space-between;gap:24px;border-top:1px solid var(--border-soft)}.settings-row.compact{min-height:42px}.settings-row>div{display:grid;gap:2px}.settings-row strong{font-size:var(--font-sm)}.settings-row span{color:var(--muted);font-size:var(--font-sm);line-height:1.4}
  .advanced-recovery,.recent-activity{margin-top:8px;border-top:1px solid var(--border-soft)}.advanced-recovery summary,.recent-activity summary{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:12px 0;list-style:none;cursor:pointer}.advanced-recovery summary::-webkit-details-marker,.recent-activity summary::-webkit-details-marker{display:none}.advanced-recovery summary>span:first-child,.recent-activity summary>span:first-child{display:grid;gap:2px}.advanced-recovery summary strong,.recent-activity summary strong{font-size:var(--font-sm)}.advanced-recovery summary small,.recent-activity summary small{color:var(--muted);font-size:var(--font-xs)}.advanced-recovery summary>span:last-child,.recent-activity summary>span:last-child{color:var(--muted);font-size:var(--font-sm)}.recovery-list,.recent-list{border-top:1px solid var(--border-soft)}.recovery-list>div,.recent-list>div{min-height:48px;display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid var(--border-soft)}.recovery-list>div>span{display:grid;gap:2px}.recovery-list strong{font-size:var(--font-sm)}.recovery-list small{color:var(--muted);font-size:var(--font-xs)}.recent-list span{font-size:var(--font-sm)}.recent-list strong{font-size:var(--font-xs);color:#9ee8b9}.recent-list strong.failed{color:#ff9aa2}.recent-list strong.pending{color:var(--warning)}.recent-list strong.unchanged{color:var(--muted)}
  .operation-attention{position:fixed;z-index:220;right:16px;bottom:16px;width:min(360px,calc(100vw - 32px));display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:start;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);box-shadow:var(--shadow-popover)}.operation-attention.success{border-color:var(--accent-border)}.operation-attention.notice{border-color:var(--border-strong)}.operation-attention.error{border-color:#705c26}.attention-icon{width:23px;height:23px;display:grid;place-items:center;border-radius:6px;background:var(--surface-3);font-size:var(--font-sm);font-weight:800}.success .attention-icon{background:var(--accent-soft);color:#9ee8b9}.error .attention-icon{background:var(--warning-bg);color:#fde68a}.attention-copy{display:grid;gap:2px}.attention-copy strong{font-size:var(--font-sm)}.attention-copy span{color:var(--muted);font-size:var(--font-xs);line-height:1.4}.attention-actions{display:flex;gap:4px}.attention-actions button{min-height:24px;padding:4px 6px;border:1px solid var(--border);border-radius:5px;background:var(--surface-3);font-size:var(--font-xs);font-weight:700}.attention-actions .dismiss{width:24px;padding:0;border:0;background:transparent;color:var(--muted);font-size:15px}
  @keyframes spin{to{transform:rotate(360deg)}}
  @media(max-width:760px){.desktop-shell{grid-template-columns:62px minmax(0,1fr)}.navigation{padding-inline:7px}.navigation-brand strong,.global-nav button>span:not(.nav-icon),.support-nav>span:not(.nav-icon){display:none}.navigation-brand{justify-content:center;padding-inline:0}.global-nav button,.support-nav{justify-content:center;padding:0}.page-toolbar{padding:0 16px}.page-content{padding:20px 16px 36px}.resource-row{grid-template-columns:36px minmax(0,1fr)}.resource-actions{grid-column:1/-1;justify-content:flex-end;padding-top:2px}.setup-footer,.settings-row,.recovery-list>div{align-items:flex-start;flex-direction:column}.operation-attention{right:10px;bottom:10px;width:calc(100vw - 20px);grid-template-columns:auto minmax(0,1fr)}.attention-actions{grid-column:2}}
  /* Workspace First: preserve content width with two top-level destinations. */
  .desktop-shell{display:flex;flex-direction:column}
  .navigation{min-height:56px;flex-direction:row;align-items:center;gap:20px;padding:0 24px;border-right:0;border-bottom:1px solid var(--border-soft)}
  .navigation-brand{padding:0;flex:none}
  .global-nav{display:flex;align-items:center;gap:4px}
  .global-nav button{padding:0 12px;white-space:nowrap}
  .main-view{height:auto;flex:1;min-height:0}
  .page-toolbar{min-height:48px}
  @media(max-width:760px){
    .navigation{min-height:54px;padding:0 12px;gap:10px}
    .navigation-brand{padding:0;justify-content:flex-start}
    .navigation-brand strong,.global-nav button>span:not(.nav-icon){display:inline}
    .global-nav button{padding:0 8px;gap:5px}
    .page-toolbar{padding:0 16px}
  }
  /* Healthy connections are summarized; setup and problems retain full guidance. */
  .workspace-overview .content-section{margin-bottom:24px}
  .workspace-connection{display:flex;align-items:center;gap:11px;min-height:54px;margin-bottom:22px;padding-bottom:13px;border-bottom:1px solid var(--border-soft)}
  .connection-dot{width:8px;height:8px;flex:none;border-radius:50%;background:var(--accent)}
  .connection-dot.waiting{background:var(--info)}
  .connection-dot.unknown{background:var(--warning)}
  .connection-copy{display:grid;flex:1;min-width:0;gap:2px}
  .connection-copy strong{font-size:var(--font-ui);font-weight:700}
  .connection-copy span{font-size:var(--font-sm);color:var(--muted)}
  .quiet-link{min-height:34px;flex:none;padding:4px 6px;border-radius:6px;background:transparent;color:var(--text-soft);font-size:var(--font-sm);font-weight:650;cursor:pointer}
  .quiet-link:hover{background:var(--surface-2);color:var(--text)}
  @media(max-width:760px){.workspace-connection{flex-wrap:wrap}.workspace-connection .quiet-link{margin-left:18px}}
</style>
