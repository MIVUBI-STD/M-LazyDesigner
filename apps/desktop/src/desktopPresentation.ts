import type { Compatibility, ProductMode, SystemStatus } from './desktopTypes';

// Presentation only: no process lifecycle, IPC, or readiness inference.
export const compatibilityLabel = (value: Compatibility['status'] | undefined) => {
  if (value === 'validated') return 'Validated';
  if (value === 'compatible-unverified') return 'Compatible · unverified';
  if (value === 'review-required') return 'Review required';
  if (value === 'unsupported') return 'Unsupported';
  if (value === 'invalid') return 'Unknown version';
  return 'Unavailable';
};

export const productMode = (value: SystemStatus): ProductMode => value.product_state;

export function productHeadline(value: SystemStatus) {
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

export function productMessage(value: SystemStatus) {
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

export function productGuidance(value: SystemStatus, pluginApprovalNeeded: boolean) {
  const mode = productMode(value);
  if (mode === 'welcome' && !value.bootstrap_available) return 'This Desktop build does not contain the setup package. Open Support and export diagnostics.';
  if (mode === 'security-setup' && !value.maintenance.setup_tls) return value.maintenance.blocked_reason ?? 'Secure setup is temporarily unavailable. Close active authoring tasks and try again.';
  if (mode === 'unsupported') return 'Update Blockbench to a supported version, then refresh this page.';
  if (mode === 'plugin-setup' && value.runtime_build_match === false) return 'Blockbench is running a different LazyDesigner build from the installed package. Keep the model open; reconnect after the matching verified update. Open Support for details.';
  if (mode === 'plugin-setup' && value.runtime_endpoint_match === false) return 'Blockbench and the MCP client use different local connection settings. Open Support before trying again.';
  if (mode === 'plugin-setup' && pluginApprovalNeeded) return 'Blockbench needs one-time approval for the LazyDesigner plugin.';
  if (mode === 'attention' && value.plugin_integrity === 'modified') return 'The managed Blockbench plugin was modified. Review or repair it before starting Blockbench.';
  if (mode === 'attention' && value.plugin_integrity === 'invalid') return 'The managed Blockbench plugin state is invalid. Open Support for recovery.';
  if (mode === 'attention') return value.gateway.action ?? value.blockbench.diagnostic ?? value.diagnostic ?? 'Open Support for troubleshooting tools.';
  return null;
}

export type ManagedAction = 'update' | 'rollback' | 'recover' | 'repair' | 'setup-tls';
export type ManagedActionFeedback = {
  status: string;
  kind: 'success' | 'pending' | 'unchanged';
  message: string;
};

/** Present only authoritative manager receipts; process exit 0 is not
 * evidence that a staged update has been activated. */
export function managedActionPresentation(
  action: ManagedAction,
  receipt: Record<string, unknown>
): ManagedActionFeedback {
  const status = receipt.status;
  if (typeof status !== 'string') {
    throw new Error('Managed action returned no verified status. Refresh and open Support.');
  }
  if (action === 'update') {
    if (status === 'STAGED') return {
      status, kind: 'pending',
      message: 'Update staged, not installed. Close Blockbench and active AI sessions, then choose Update components again.',
    };
    if (status === 'NO_PENDING_UPDATE') return {
      status, kind: 'unchanged',
      message: 'No staged update was found. Refresh to check the installed components.',
    };
    if (status === 'INSTALLED') return {
      status, kind: 'success',
      message: 'Managed files installed. Runtime and Blockbench are not verified yet; reconnect to confirm the new version is usable.',
    };
  }
  const expected: Record<Exclude<ManagedAction, 'update'>, string> = {
    rollback: 'ROLLBACK_COMPLETE',
    recover: 'RECOVER_COMPLETE',
    repair: 'REPAIRED',
    'setup-tls': 'TLS_READY',
  };
  if (action !== 'update' && status === expected[action]) {
    return {
      status, kind: 'success',
      message: {
        rollback: 'Previous managed version restored.',
        recover: 'Interrupted installation recovered.',
        repair: 'Managed files repaired.',
        'setup-tls': 'Secure local connection configured.',
      }[action],
    };
  }
  throw new Error(`Unexpected managed ${action} result (${status}). Refresh and open Support.`);
}
