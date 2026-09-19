import { ensureRuntimeTlsIdentity } from "../distribution/runtime-tls";

export { ensureRuntimeTlsIdentity as setupRuntimeTls };

if (import.meta.main) {
  const status = ensureRuntimeTlsIdentity();
  console.log(`Runtime TLS ready: ${status.cert}`);
}
