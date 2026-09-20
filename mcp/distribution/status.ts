import { activeGateways, installedState, readOptional, rollbackStatus } from "./managed-install";

export type ManagedStatus = {
  schema: 1;
  installed: Awaited<ReturnType<typeof installedState>>;
  pending: boolean;
  gateway_active: boolean;
  runtime_online: boolean;
  runtime_url: string;
  tls_ready: boolean;
  tls_error: string | null;
  rollback: Awaited<ReturnType<typeof rollbackStatus>>;
};

export async function buildManagedStatus(
  root: string,
  pendingPath: string,
  runtimeStatus: (config?: string) => Promise<{ online: boolean; url: string }>,
  tlsStatus: () => { ready: boolean; error: string | null }
): Promise<ManagedStatus> {
  const installed = await installedState(root);
  const [pending, gatewayActive, runtime, rollback] = await Promise.all([
    readOptional(pendingPath).then(Boolean),
    activeGateways(root),
    runtimeStatus(installed?.options.config),
    rollbackStatus(root),
  ]);
  const tls = tlsStatus();
  return { schema: 1, installed, pending, gateway_active: gatewayActive, runtime_online: runtime.online, runtime_url: runtime.url, tls_ready: tls.ready, tls_error: tls.error, rollback };
}
