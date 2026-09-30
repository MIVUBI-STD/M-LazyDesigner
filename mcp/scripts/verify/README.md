# Verification Scripts

This directory owns focused local/live verification commands and the shared live MCP client helper.

```text
live-e2e-common.ts
verify-stateless-local.ts
verify-geometry-live.ts
verify-texturing-live.ts
verify-animation-live.ts
verify-particle-live.ts
verify-persistence-live.ts
verify-project-affinity-live.ts
verify-surface-gap-live.ts
verify-template-live.ts
verify-texture-runtime-live.ts
verify-uv-density-live.ts
verify-astra-usage-ready.ts
```

Live verifiers prove installed/runtime behavior only when actually executed against the matching build. Repository/source structure alone must not be treated as live proof.
