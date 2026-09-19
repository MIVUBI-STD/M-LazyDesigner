import { ensureRuntimeTlsIdentity } from "../distribution/runtime-tls";

/** Compatibility wrapper for local development/tests; canonical ownership is distribution/runtime-tls.ts. */
export function setupRuntimeTls(): string {
  return ensureRuntimeTlsIdentity().cert;
}

if (import.meta.main) {
  console.log(`Runtime TLS ready: ${setupRuntimeTls()}`);
}
