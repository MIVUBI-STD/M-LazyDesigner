import { activeGateways, installedState, readOptional } from "./managed-install";

export type ManagedStatus = {
  schema: 1;
  installed: Awaited<ReturnType<typeof installedState>>;
  pending: boolean;
  gateway_active: boolean;
  runtime_online: boolean;
};

export async function buildManagedStatus(
  root: string,
  pendingPath: string,
  runtimeOnline: (config?: string) => Promise<boolean>
): Promise<ManagedStatus> {
  const installed = await installedState(root);
  const [pending, gatewayActive, runtimeReachable] = await Promise.all([
    readOptional(pendingPath).then(Boolean),
    activeGateways(root),
    runtimeOnline(installed?.options.config),
  ]);

  return {
    schema: 1,
    installed,
    pending,
    gateway_active: gatewayActive,
    runtime_online: runtimeReachable,
  };
}
