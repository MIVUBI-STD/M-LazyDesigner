import { activeGateways, installedState, readOptional } from "./managed-install";

export type ManagedStatus = {
  schema: 1;
  installed: Awaited<ReturnType<typeof installedState>>;
  pending: boolean;
  gateway_active: boolean;
  runtime_online: boolean;
  tls_ready: boolean;
  tls_error: string | null;
};

export async function buildManagedStatus(
  root: string,
  pendingPath: string,
  runtimeOnline: (config?: string) => Promise<boolean>,
  tlsStatus: () => { ready: boolean; error: string | null }
): Promise<ManagedStatus> {
  const installed = await installedState(root);
  const [pending, gatewayActive, runtimeReachable] = await Promise.all([
    readOptional(pendingPath).then(Boolean),
    activeGateways(root),
    runtimeOnline(installed?.options.config),
  ]);

  const tls = tlsStatus();
  return {
    schema: 1,
    installed,
    pending,
    gateway_active: gatewayActive,
    runtime_online: runtimeReachable,
    tls_ready: tls.ready,
    tls_error: tls.error,
  };
}
