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
  if (mode === 'plugin-setup' && value.runtime_endpoint_match === false) return 'Blockbench and the MCP client use different local connection settings. Open Support before trying again.';
  if (mode === 'plugin-setup' && pluginApprovalNeeded) return 'Blockbench needs one-time approval for the LazyDesigner plugin.';
  if (mode === 'attention' && value.plugin_integrity === 'modified') return 'The managed Blockbench plugin was modified. Review or repair it before starting Blockbench.';
  if (mode === 'attention' && value.plugin_integrity === 'invalid') return 'The managed Blockbench plugin state is invalid. Open Support for recovery.';
  if (mode === 'attention') return value.gateway.action ?? value.blockbench.diagnostic ?? value.diagnostic ?? 'Open Support for troubleshooting tools.';
  return null;
}
